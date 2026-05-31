<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DatabaseController extends Controller
{
    private const ALLOWED_TABLES = [
        'users',
        'departments',
        'positions',
        'ranking_cycles',
        'applications',
        'application_logs',
        'archived_faculty_users',
        'areas',
        'area_iv_student_evaluation_imports',
        'area_part_templates',
        'area_submissions',
        'area_submission_criterion_scores',
        'cycle_participants',
        'notifications',
    ];

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
        'area_submission_criterion_scores' => 'criterion_score_id',
        'cycle_participants' => 'participant_id',
        'notifications' => 'id',
    ];

    public function query(Request $request): JsonResponse
    {
        $table = (string) $request->input('table', '');
        $action = strtolower((string) $request->input('action', 'select'));

        if (!in_array($table, self::ALLOWED_TABLES, true)) {
            return response()->json(['error' => 'Table not allowed.'], 422);
        }

        return match ($action) {
            'insert' => $this->insert($request, $table),
            'update' => $this->update($request, $table),
            'delete' => $this->delete($request, $table),
            default => $this->select($request, $table),
        };
    }

    private function select(Request $request, string $table): JsonResponse
    {
        $query = DB::table($table);
        $this->applyFilters($query, $request->input('filters', []), $table);
        $this->applyOrdering($query, $request->input('order', []), $table);

        $limit = $request->input('limit');
        if (is_numeric($limit)) {
            $query->limit((int) $limit);
        }

        $offset = $request->input('offset');
        if (is_numeric($offset)) {
            $query->offset((int) $offset);
        }

        $columns = $this->normalizeColumns($request->input('columns', $request->input('select', '*')));
        if ($columns !== null) {
            $query->select($columns);
        }

        $rows = $query->get()->map(fn ($row) => $this->normalizeRow($table, (array) $row))->values()->all();

        if ($request->boolean('single') || $request->boolean('maybeSingle')) {
            $row = $rows[0] ?? null;

            if ($request->boolean('single') && !$row) {
                return response()->json(['error' => 'No rows found.'], 404);
            }

            return response()->json(['data' => $row]);
        }

        return response()->json(['data' => $rows]);
    }

    private function insert(Request $request, string $table): JsonResponse
    {
        $rows = $this->normalizeRows($request->input('values', $request->input('data', [])));

        if ($rows === []) {
            return response()->json(['error' => 'No insert data supplied.'], 422);
        }

        DB::table($table)->insert($rows);

        return response()->json(['data' => $rows]);
    }

    private function update(Request $request, string $table): JsonResponse
    {
        $values = $this->normalizeAssociativeArray($request->input('values', $request->input('data', [])));

        if ($values === []) {
            return response()->json(['error' => 'No update data supplied.'], 422);
        }

        $query = DB::table($table);
        $this->applyFilters($query, $request->input('filters', []), $table);

        $affected = $query->update($values);

        return response()->json(['data' => ['updated' => $affected]]);
    }

    private function delete(Request $request, string $table): JsonResponse
    {
        $query = DB::table($table);
        $this->applyFilters($query, $request->input('filters', []), $table);

        $deleted = $query->delete();

        return response()->json(['data' => ['deleted' => $deleted]]);
    }

    private function applyFilters(Builder $query, mixed $filters, string $table): void
    {
        foreach (is_array($filters) ? $filters : [] as $filter) {
            if (!is_array($filter)) {
                continue;
            }

            $column = $this->normalizeColumnName((string) ($filter['column'] ?? ''), $table);
            $operator = strtolower(trim((string) ($filter['operator'] ?? '=')));
            $value = $filter['value'] ?? null;

            match ($operator) {
                '=', 'eq' => $query->where($column, '=', $value),
                '!=', '<>', 'ne', 'neq' => $query->where($column, '!=', $value),
                '>', 'gt' => $query->where($column, '>', $value),
                '>=', 'gte' => $query->where($column, '>=', $value),
                '<', 'lt' => $query->where($column, '<', $value),
                '<=', 'lte' => $query->where($column, '<=', $value),
                'in' => $query->whereIn($column, is_array($value) ? $value : [$value]),
                'not in' => $query->whereNotIn($column, is_array($value) ? $value : [$value]),
                'like' => $query->where($column, 'like', (string) $value),
                'ilike' => $query->whereRaw('LOWER('.$this->wrapColumn($column).') LIKE LOWER(?)', [(string) $value]),
                'not like' => $query->where($column, 'not like', (string) $value),
                'not ilike' => $query->whereRaw('LOWER('.$this->wrapColumn($column).') NOT LIKE LOWER(?)', [(string) $value]),
                'is' => $value === null ? $query->whereNull($column) : $query->where($column, '=', $value),
                'not' => $value === null ? $query->whereNotNull($column) : $query->where($column, '!=', $value),
                default => $query->where($column, '=', $value),
            };
        }
    }

    private function applyOrdering(Builder $query, mixed $ordering, string $table): void
    {
        foreach (is_array($ordering) ? $ordering : [] as $order) {
            if (!is_array($order)) {
                continue;
            }

            $column = $this->normalizeColumnName((string) ($order['column'] ?? ''), $table);
            $direction = strtolower((string) ($order['direction'] ?? ($order['ascending'] ?? true ? 'asc' : 'desc')));

            $query->orderBy($column, $direction === 'desc' ? 'desc' : 'asc');
        }
    }

    private function normalizeColumns(mixed $columns): ?array
    {
        if ($columns === null || $columns === '*' || $columns === ['*']) {
            return null;
        }

        if (is_string($columns)) {
            $columns = array_map('trim', explode(',', $columns));
        }

        if (!is_array($columns)) {
            return null;
        }

        return array_values(array_filter($columns, static fn ($column) => $column !== ''));
    }

    private function normalizeRows(mixed $values): array
    {
        if (!is_array($values)) {
            return [];
        }

        if ($values === [] || array_is_list($values)) {
            return array_map([$this, 'normalizeAssociativeArray'], $values);
        }

        return [$this->normalizeAssociativeArray($values)];
    }

    private function normalizeAssociativeArray(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_map(static function ($item) {
            if (is_bool($item)) {
                return (int) $item;
            }

            return $item;
        }, $value);
    }

    private function normalizeRow(string $table, array $row): array
    {
        $primaryKey = self::PRIMARY_KEYS[$table] ?? 'id';

        if (!array_key_exists('id', $row) && array_key_exists($primaryKey, $row)) {
            $row['id'] = $row[$primaryKey];
        }

        return $row;
    }

    private function normalizeColumnName(string $column, string $table): string
    {
        $column = trim($column);

        if ($column === 'id') {
            return self::PRIMARY_KEYS[$table] ?? 'id';
        }

        return $column;
    }

    private function wrapColumn(string $column): string
    {
        return '`'.str_replace('`', '', $column).'`';
    }
}