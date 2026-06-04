<?php

namespace App\Http\Controllers\Api\HrAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index()
    {
        // Return only faculty users (exclude admin/VPAA)
        $users = User::query()
            ->select('users.*')
            ->leftJoin('archived_faculty_users as archived', 'archived.source_user_id', '=', 'users.user_id')
            ->whereNull('archived.source_user_id')
            ->where('users.role', '=', 'Faculty')
            ->orderByDesc('users.created_at')
            ->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,domain_email'],
            'name_first' => ['required', 'string', 'max:255'],
            'name_middle' => ['nullable', 'string', 'max:255'],
            'name_last' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:6'],
            'department_id' => ['nullable', 'integer', 'exists:departments,department_id'],
            'current_rank' => ['nullable', 'string', 'max:255'],
            'nature_of_appointment' => ['nullable', 'string', 'max:255'],
            'last_promotion_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['ranking', 'inactive'])],
            'teaching_experience_years' => ['nullable', 'integer', 'min:0'],
            'industry_experience_years' => ['nullable', 'integer', 'min:0'],
            'applying_for' => ['nullable'],
            'applying_for_json' => ['nullable', 'array'],
            'educational_attainment' => ['nullable', 'string', 'max:255'],
            'educational_attainment_json' => ['nullable', 'array'],
            'eligibility_exams' => ['nullable'],
            'eligibility_exams_json' => ['nullable', 'array'],
            'doctorate' => ['nullable', 'array'],
            'current_salary' => ['nullable'],
            'cycle_id' => ['nullable', 'integer', 'exists:ranking_cycles,cycle_id'],
        ]);

        $user = User::create([
            'name_last' => $validated['name_last'],
            'name_first' => $validated['name_first'],
            'name_middle' => $validated['name_middle'] ?? null,
            'domain_email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'role' => 'Faculty',
            'department_id' => $validated['department_id'] ?? null,
            'current_rank' => $validated['current_rank'] ?? null,
            'current_salary' => $validated['current_salary'] ?? null,
            'nature_of_appointment' => $validated['nature_of_appointment'] ?? null,
            'educational_attainment' => $validated['educational_attainment'] ?? null,
            'eligibility_exams' => $validated['eligibility_exams'] ?? null,
            'teaching_experience_years' => $validated['teaching_experience_years'] ?? 0,
            'industry_experience_years' => $validated['industry_experience_years'] ?? 0,
            'applying_for' => $this->normalizeApplyingForLegacy($request->input('applying_for_json'), $request->input('applying_for')),
            'date_of_last_promotion' => $validated['last_promotion_date'] ?? null,
            'last_promotion_date' => $validated['last_promotion_date'] ?? null,
            'status' => $validated['status'] ?? 'ranking',
            'is_first_login' => true,
            'doctorate' => $validated['doctorate'] ?? null,
            'educational_attainment_json' => $validated['educational_attainment_json'] ?? null,
            'eligibility_exams_json' => $validated['eligibility_exams_json'] ?? null,
            'applying_for_json' => $this->normalizeArray($request->input('applying_for_json')),
        ]);

        if (!empty($validated['cycle_id'])) {
            $this->upsertParticipant((int) $validated['cycle_id'], $user->user_id, $user->domain_email, 'accepted');
        }

        return response()->json($user->fresh());
    }

    public function update(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);

        $validated = $request->validate([
            'name_first' => ['required', 'string', 'max:255'],
            'name_middle' => ['nullable', 'string', 'max:255'],
            'name_last' => ['required', 'string', 'max:255'],
            'department_id' => ['nullable', 'integer', 'exists:departments,department_id'],
            'current_rank' => ['nullable', 'string', 'max:255'],
            'nature_of_appointment' => ['nullable', 'string', 'max:255'],
            'last_promotion_date' => ['nullable', 'date'],
            'status' => ['nullable', Rule::in(['ranking', 'inactive'])],
            'teaching_experience_years' => ['nullable', 'integer', 'min:0'],
            'industry_experience_years' => ['nullable', 'integer', 'min:0'],
            'applying_for' => ['nullable'],
            'applying_for_json' => ['nullable', 'array'],
            'educational_attainment' => ['nullable', 'string', 'max:255'],
            'educational_attainment_json' => ['nullable', 'array'],
            'eligibility_exams' => ['nullable'],
            'eligibility_exams_json' => ['nullable', 'array'],
            'doctorate' => ['nullable', 'array'],
            'current_salary' => ['nullable'],
        ]);

        $user->fill([
            'name_first' => $validated['name_first'],
            'name_middle' => $validated['name_middle'] ?? null,
            'name_last' => $validated['name_last'],
            'department_id' => $validated['department_id'] ?? null,
            'current_rank' => $validated['current_rank'] ?? null,
            'current_salary' => $validated['current_salary'] ?? null,
            'nature_of_appointment' => $validated['nature_of_appointment'] ?? null,
            'educational_attainment' => $validated['educational_attainment'] ?? null,
            'eligibility_exams' => $validated['eligibility_exams'] ?? null,
            'teaching_experience_years' => $validated['teaching_experience_years'] ?? 0,
            'industry_experience_years' => $validated['industry_experience_years'] ?? 0,
            'applying_for' => $this->normalizeApplyingForLegacy($request->input('applying_for_json'), $request->input('applying_for')),
            'date_of_last_promotion' => $validated['last_promotion_date'] ?? null,
            'last_promotion_date' => $validated['last_promotion_date'] ?? null,
            'status' => $validated['status'] ?? $user->status ?? 'ranking',
            'doctorate' => $validated['doctorate'] ?? null,
            'educational_attainment_json' => $validated['educational_attainment_json'] ?? null,
            'eligibility_exams_json' => $validated['eligibility_exams_json'] ?? null,
            'applying_for_json' => $this->normalizeArray($request->input('applying_for_json')),
        ]);

        $user->save();

        return response()->json($user->fresh());
    }

    public function updateStatus(Request $request, int $userId)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['ranking', 'inactive'])],
        ]);

        $user = User::findOrFail($userId);
        $user->status = $validated['status'];
        $user->save();

        return response()->json($user->fresh());
    }

    public function archive(Request $request, int $userId)
    {
        $user = User::findOrFail($userId);
        $reason = $request->input('reason');
        $now = now();

        DB::transaction(function () use ($user, $reason, $now) {
            DB::table('archived_faculty_users')->updateOrInsert(
                ['source_user_id' => $user->user_id],
                [
                    'name_last' => $user->name_last,
                    'name_first' => $user->name_first,
                    'name_middle' => $user->name_middle,
                    'domain_email' => $user->domain_email,
                    'password_hash' => $user->password_hash,
                    'role' => $user->role,
                    'department_id' => $user->department_id,
                    'current_rank' => $user->current_rank,
                    'current_salary' => $user->current_salary,
                    'nature_of_appointment' => $user->nature_of_appointment,
                    'educational_attainment' => $user->educational_attainment,
                    'eligibility_exams' => $user->eligibility_exams,
                    'teaching_experience_years' => $user->teaching_experience_years,
                    'industry_experience_years' => $user->industry_experience_years,
                    'applying_for' => $user->applying_for,
                    'date_of_last_promotion' => $user->date_of_last_promotion,
                    'status' => 'inactive',
                    'is_first_login' => $user->is_first_login,
                    'created_at' => $user->created_at,
                    'doctorate' => $this->jsonColumn($user->doctorate),
                    'educational_attainment_json' => $this->jsonColumn($user->educational_attainment_json),
                    'eligibility_exams_json' => $this->jsonColumn($user->eligibility_exams_json),
                    'last_promotion_date' => $user->last_promotion_date,
                    'applying_for_json' => $this->jsonColumn($user->applying_for_json),
                    'archived_at' => $now,
                    'archived_by' => null,
                    'archived_reason' => $reason,
                ]
            );

            User::where('user_id', $user->user_id)->update(['status' => 'inactive']);

            DB::table('cycle_participants')
                ->where('faculty_id', $user->user_id)
                ->update([
                    'status' => 'removed',
                    'responded_at' => $now,
                    'updated_at' => $now,
                ]);
        });

        return response()->json(['message' => 'Faculty archived successfully']);
    }

    public function departments()
    {
        $departments = DB::table('departments')
            ->select('department_id', 'department_name', 'department_code')
            ->orderBy('department_code')
            ->orderBy('department_name')
            ->get();

        return response()->json($departments);
    }

    public function cycles()
    {
        $cycles = DB::table('ranking_cycles')
            ->select(
                'cycle_id',
                'title',
                'semester',
                'start_date',
                'deadline',
                'status',
                'created_by',
                'created_at',
                'profile_edit_start',
                'profile_edit_deadline',
                'profile_edit_open',
                'year'
            )
            ->orderByDesc('created_at')
            ->get();

        return response()->json($cycles);
    }

    public function createCycle(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'year' => ['required', 'string', 'max:50'],
            'semester' => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'deadline' => ['required', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'status' => ['required', Rule::in(['open', 'submissions_closed', 'finished', 'closed'])],
            'profile_edit_start' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'profile_edit_deadline' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'profile_edit_open' => ['nullable', 'boolean'],
        ]);

        // Convert ISO 8601 format to MySQL datetime format
        $formatDate = fn($isoDate) => $isoDate ? \DateTime::createFromFormat('Y-m-d\TH:i:s.000\Z', $isoDate)?->format('Y-m-d H:i:s') : null;

        $cycle = DB::table('ranking_cycles')->insertGetId([
            'title' => $validated['title'],
            'year' => $validated['year'],
            'semester' => $validated['semester'],
            'start_date' => $formatDate($validated['start_date']),
            'deadline' => $formatDate($validated['deadline']),
            'status' => $validated['status'],
            'created_by' => 2, // Default to admin user_id
            'profile_edit_start' => $formatDate($validated['profile_edit_start']),
            'profile_edit_deadline' => $formatDate($validated['profile_edit_deadline']),
            'profile_edit_open' => $validated['profile_edit_open'] ?? false,
            'created_at' => now(),
        ]);

        return response()->json(
            DB::table('ranking_cycles')->where('cycle_id', $cycle)->first()
        );
    }

    public function finalizeCycle(Request $request, int $cycleId)
    {
        DB::beginTransaction();

        try {
            $cycle = DB::table('ranking_cycles')->where('cycle_id', $cycleId)->first();

            if (!$cycle) {
                DB::rollBack();
                return response()->json(['error' => 'Cycle not found'], 404);
            }

            DB::table('ranking_cycles')
                ->where('cycle_id', $cycleId)
                ->update([
                    'status' => 'finished',
                    'profile_edit_open' => false,
                ]);

            DB::table('users')
                ->where('status', 'ranking')
                ->update(['status' => 'inactive']);

            DB::table('cycle_participants')
                ->where('cycle_id', $cycleId)
                ->whereIn('status', ['invited', 'accepted'])
                ->update([
                    'status' => 'removed',
                    'responded_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::commit();

            return response()->json([
                'ok' => true,
                'cycle' => DB::table('ranking_cycles')->where('cycle_id', $cycleId)->first(),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'error' => 'Could not finalize cycle',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateCycle(Request $request, int $cycleId)
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'year' => ['nullable', 'string', 'max:50'],
            'semester' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'deadline' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'status' => ['nullable', Rule::in(['open', 'submissions_closed', 'finished', 'closed'])],
            'profile_edit_start' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'profile_edit_deadline' => ['nullable', 'date_format:Y-m-d\TH:i:s.000\Z'],
            'profile_edit_open' => ['nullable', 'boolean'],
        ]);

        // Convert ISO 8601 format to MySQL datetime format
        $formatDate = fn($isoDate) => $isoDate ? \DateTime::createFromFormat('Y-m-d\TH:i:s.000\Z', $isoDate)?->format('Y-m-d H:i:s') : null;

        $existing = DB::table('ranking_cycles')->where('cycle_id', $cycleId)->first();

        DB::table('ranking_cycles')->where('cycle_id', $cycleId)->update([
            'title' => $validated['title'] ?? $existing->title,
            'year' => $validated['year'] ?? $existing->year,
            'semester' => $validated['semester'] ?? $existing->semester,
            'start_date' => array_key_exists('start_date', $validated) ? $formatDate($validated['start_date']) : $existing->start_date,
            'deadline' => array_key_exists('deadline', $validated) ? $formatDate($validated['deadline']) : $existing->deadline,
            'status' => $validated['status'] ?? $existing->status,
            'profile_edit_start' => array_key_exists('profile_edit_start', $validated) ? $formatDate($validated['profile_edit_start']) : $existing->profile_edit_start,
            'profile_edit_deadline' => array_key_exists('profile_edit_deadline', $validated) ? $formatDate($validated['profile_edit_deadline']) : $existing->profile_edit_deadline,
            'profile_edit_open' => $validated['profile_edit_open'] ?? $existing->profile_edit_open ?? false,
        ]);

        return response()->json(
            DB::table('ranking_cycles')->where('cycle_id', $cycleId)->first()
        );
    }

    public function participants(int $cycleId)
    {
        $participants = DB::table('cycle_participants')
            ->where('cycle_id', $cycleId)
            ->where('status', 'accepted')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($participants);
    }

    public function upsertParticipant(Request $request, int $cycleId)
    {
        $validated = $request->validate([
            'faculty_id' => ['required', 'integer', 'exists:users,user_id'],
            'invite_email' => ['required', 'email'],
            'status' => ['nullable', Rule::in(['invited', 'accepted', 'declined', 'removed'])],
            'invited_by' => ['nullable', 'integer', 'exists:users,user_id'],
            'notes' => ['nullable', 'string'],
        ]);

        $now = now();
        $status = $validated['status'] ?? 'accepted';

        $payload = [
            'cycle_id' => $cycleId,
            'faculty_id' => $validated['faculty_id'],
            'invite_email' => $validated['invite_email'],
            'status' => $status,
            'invited_by' => $validated['invited_by'] ?? null,
            'responded_at' => in_array($status, ['accepted', 'declined', 'removed'], true) ? $now : null,
            'notes' => $validated['notes'] ?? null,
            'updated_at' => $now,
            'invited_at' => $now,
        ];

        $existing = DB::table('cycle_participants')
            ->where('cycle_id', $cycleId)
            ->where('faculty_id', $validated['faculty_id'])
            ->first();

        if ($existing) {
            DB::table('cycle_participants')
                ->where('participant_id', $existing->participant_id)
                ->update($payload);
        } else {
            DB::table('cycle_participants')->insert($payload + ['created_at' => $now]);
        }

        return response()->json(
            DB::table('cycle_participants')
                ->where('cycle_id', $cycleId)
                ->where('faculty_id', $validated['faculty_id'])
                ->first()
        );
    }

    public function removeParticipant(int $cycleId, int $facultyId)
    {
        $now = now();
        DB::table('cycle_participants')
            ->where('cycle_id', $cycleId)
            ->where('faculty_id', $facultyId)
            ->update([
                'status' => 'removed',
                'responded_at' => $now,
                'updated_at' => $now,
            ]);

        // Return success even if participant doesn't exist (idempotent delete)
        return response()->json(['message' => 'Participant removed or does not exist']);
    }

    private function normalizeArray(mixed $value): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }

            $items = array_values(array_filter(array_map('trim', preg_split('/\s*,\s*/', $value) ?: [])));
            return $items ?: null;
        }

        return null;
    }

    private function normalizeApplyingForLegacy(mixed $jsonValue, mixed $fallbackValue): ?string
    {
        $values = $this->normalizeArray($jsonValue);

        if (is_array($values) && count($values) > 0) {
            return implode(', ', array_map('strval', $values));
        }

        if (is_string($fallbackValue) && trim($fallbackValue) !== '') {
            return trim($fallbackValue);
        }

        return null;
    }

    private function jsonColumn(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}