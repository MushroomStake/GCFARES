<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class DatabaseController extends Controller
{
    private const PRIMARY_KEYS = [
        'users' => 'user_id',
        'departments' => 'department_id',
        'positions' => 'position_id',
        'ranking_cycles' => 'cycle_id',
        'applications' => 'application_id',
        'application_logs' => 'log_id',
        'archived_faculty_users' => 'archive_id',
        'areas' => 'area_id',
        'area_iv_student_evaluation_imports' => 'import_id',
        'area_part_templates' => 'template_id',
        'area_submissions' => 'submission_id',
        'cycle_participants' => 'participant_id',
        'notifications' => 'id',
    ];

    public function query(Request $request)
    {
        $validated = $request->validate([
            'table' => ['required', 'string'],
            'operation' => ['nullable', 'string'],
            'select' => ['nullable'],
            'filters' => ['nullable', 'array'],
            'order' => ['nullable', 'array'],
            'limit' => ['nullable', 'integer'],
            'offset' => ['nullable', 'integer'],
            'single' => ['nullable', 'boolean'],
            'values' => ['nullable'],
        ]);

        $table = $this->assertValidTable($validated['table']);
        $operation = strtolower((string) ($validated['operation'] ?? 'select'));

        return match ($operation) {
            'insert' => $this->insertRows($table, $validated),
            'update' => $this->updateRows($table, $validated),
            'delete' => $this->deleteRows($table, $validated),
            default => $this->selectRows($table, $validated),
        };
    }

    private function selectRows(string $table, array $payload)
    {
        $query = $this->buildBaseQuery($table, $payload, 'select');
        if ($query === null) {
            if (!empty($payload['single'])) {
                return response()->json(['data' => null]);
            }

            return response()->json(['data' => []]);
        }

        $rows = $query->get()->map(fn ($row) => (array) $row)->values()->all();

        if (!empty($payload['single'])) {
            return response()->json(['data' => $rows[0] ?? null]);
        }

        return response()->json(['data' => $rows]);
    }

    private function insertRows(string $table, array $payload)
    {
        $this->guardLegacySubmissionMutation($table, 'insert');

        $values = $payload['values'] ?? null;
        if ($values === null) {
            return response()->json(['error' => 'Missing values for insert.'], 422);
        }

        $rows = $this->normalizeRows($values);
        if (count($rows) === 0) {
            return response()->json(['error' => 'No rows supplied for insert.'], 422);
        }

        try {
            $inserted = DB::transaction(function () use ($table, $rows) {
                $primaryKey = self::PRIMARY_KEYS[$table] ?? null;
                $insertedRows = [];

                foreach ($rows as $row) {
                    $row = $this->sanitizeRow($row);
                    $query = DB::table($table);

                    if ($primaryKey && Schema::hasColumn($table, $primaryKey)) {
                        $insertId = $query->insertGetId($row, $primaryKey);
                        $insertedRow = DB::table($table)->where($primaryKey, $insertId)->first();
                        $insertedRows[] = $insertedRow ? (array) $insertedRow : array_merge([$primaryKey => $insertId], $row);
                    } else {
                        $query->insert($row);
                        $insertedRows[] = $row;
                    }
                }

                return $insertedRows;
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'error' => sprintf('Insert failed for table %s: %s', $table, $e->getMessage()),
            ], 500);
        }

        if (!empty($payload['single'])) {
            return response()->json(['data' => $inserted[0] ?? null]);
        }

        return response()->json(['data' => count($inserted) === 1 ? ($inserted[0] ?? null) : $inserted]);
    }

    private function updateRows(string $table, array $payload)
    {
        $this->guardLegacySubmissionMutation($table, 'update');

        $values = is_array($payload['values'] ?? null) ? $payload['values'] : [];
        if ($values === []) {
            return response()->json(['error' => 'Missing values for update.'], 422);
        }

        $query = $this->buildBaseQuery($table, $payload, 'update');
        if ($query === null) {
            return response()->json(['error' => 'Invalid or unsupported column.'], 422);
        }

        $updated = $query->update($this->sanitizeRow($values));

        return response()->json(['data' => ['updated' => $updated]]);
    }

    private function deleteRows(string $table, array $payload)
    {
        $this->guardLegacySubmissionMutation($table, 'delete');

        $query = $this->buildBaseQuery($table, $payload, 'delete');
        if ($query === null) {
            return response()->json(['error' => 'Invalid or unsupported column.'], 422);
        }

        $deleted = $query->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    private function guardLegacySubmissionMutation(string $table, string $operation): void
    {
        if ($table !== 'area_submissions') {
            return;
        }

        throw new HttpResponseException(response()->json([
            'error' => sprintf(
                'Legacy %s on area_submissions via /api/database/query is disabled. Use /api/faculty/submissions endpoints.',
                $operation,
            ),
        ], 422));
    }

    private function buildBaseQuery(string $table, array $payload, string $mode = 'select')
    {
        $query = DB::table($table);
        $strict = $mode !== 'select';

        foreach (($payload['filters'] ?? []) as $filter) {
            if (!is_array($filter)) {
                continue;
            }

            $column = $this->resolveColumnName($table, $filter['column'] ?? null, $strict);
            if ($column === null) {
                return null;
            }

            $operator = strtolower((string) ($filter['operator'] ?? 'eq'));
            $value = $filter['value'] ?? null;

            $query = match ($operator) {
                'eq' => $query->where($column, '=', $value),
                'neq' => $query->where($column, '!=', $value),
                'gt' => $query->where($column, '>', $value),
                'gte' => $query->where($column, '>=', $value),
                'lt' => $query->where($column, '<', $value),
                'lte' => $query->where($column, '<=', $value),
                'like' => $query->where($column, 'like', $value),
                'ilike' => $query->where($column, 'like', $value),
                'in' => $query->whereIn($column, is_array($value) ? $value : [$value]),
                'is' => $value === null ? $query->whereNull($column) : $query->where($column, '=', $value),
                default => throw new InvalidArgumentException('Unsupported filter operator: ' . $operator),
            };
        }

        $order = $payload['order'] ?? null;
        if (is_array($order) && !empty($order['column'])) {
            $column = $this->resolveColumnName($table, $order['column'], $strict);
            $direction = strtolower((string) ($order['direction'] ?? $order['dir'] ?? 'asc'));
            $query->orderBy($column, $direction === 'desc' ? 'desc' : 'asc');

            $select = $payload['select'] ?? null;
            $columns = is_string($select)
                ? array_values(array_filter(array_map('trim', explode(',', $select))))
                : (is_array($select) ? array_values(array_filter(array_map('trim', $select))) : ['*']);

            if ($columns !== ['*'] && $columns !== []) {
                $query->select($columns);
            }
        }

        return $query;
    }

    private function normalizeRows(mixed $values): array
    {
        if (is_array($values) && array_is_list($values)) {
            return $values;
        }

        if (is_array($values)) {
            return [$values];
        }

        return [];
    }

    private function sanitizeRow(array $row): array
    {
        foreach ($row as $key => $value) {
            if (!is_string($value)) {
                continue;
            }

            if (!preg_match('/(?:_at|_date|timestamp)$/i', (string) $key) && !in_array($key, ['created_at', 'updated_at'], true)) {
                continue;
            }

            try {
                $row[$key] = Carbon::parse($value)->format('Y-m-d H:i:s');
            } catch (\Throwable) {
                // Leave non-datetime strings unchanged.
            }
        }

        unset($row['_count']);
        return $row;
    }

    private function assertValidTable(?string $table): string
    {
        $table = trim((string) $table);

        if ($table === '' || !preg_match('/^[A-Za-z0-9_]+$/', $table)) {
            throw new HttpResponseException(response()->json(['error' => 'Invalid table name.'], 422));
        }

        if (!Schema::hasTable($table)) {
            throw new HttpResponseException(response()->json(['error' => 'Table not found.'], 404));
        }

        return $table;
    }

    private function resolveColumnName(string $table, ?string $column, bool $strict = true): ?string
    {
        $column = trim((string) $column);

        if ($column === '' || !preg_match('/^[A-Za-z0-9_]+$/', $column)) {
            if ($strict) {
                throw new HttpResponseException(response()->json(['error' => 'Invalid column name.'], 422));
            }

            return null;
        }

        if (Schema::hasColumn($table, $column)) {
            return $column;
        }

        if ($table === 'users') {
            $aliases = [
                'domain_email' => 'email',
                'email' => 'domain_email',
                'id' => 'user_id',
                'user_id' => 'id',
            ];

            $mapped = $aliases[$column] ?? null;
            if ($mapped && Schema::hasColumn($table, $mapped)) {
                return $mapped;
            }
        }

        if ($strict) {
            throw new HttpResponseException(response()->json(['error' => 'Invalid or unsupported column.'], 422));
        }

        return null;
    }
}
