<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class FacultyPortalController extends Controller
{
    public function bootstrap(Request $request)
    {
        $user = $this->requireUser($request);
        $profile = $this->fetchProfileRow($user->user_id);
        $cycle = $this->resolveCurrentCycle();
        $application = $cycle ? $this->fetchLatestApplicationForFaculty($user->user_id, (int) $cycle->cycle_id) : $this->fetchLatestApplicationForFaculty($user->user_id, null);

        $submissions = [];
        if ($application) {
            $submissions = DB::table('area_submissions')
                ->where('application_id', $application->application_id)
                ->orderByDesc('uploaded_at')
                ->get()
                ->map(fn ($row) => (array) $row)
                ->values()
                ->all();
        }

        return response()->json([
            'user' => $this->normalizeUser($profile ?? $user),
            'cycle' => $cycle,
            'application' => $application,
            'areas' => DB::table('areas')->orderBy('area_id')->get(),
            'positions' => DB::table('positions')->where('is_active', 1)->orderBy('position_id')->get(),
            'submissions' => $submissions,
        ]);
    }

    public function me(Request $request)
    {
        $user = $this->requireUser($request);
        $profile = $this->fetchProfileRow($user->user_id);

        return response()->json([
            'user' => $this->normalizeUser($profile ?? $user),
            'profile' => $profile,
        ]);
    }

    public function updateMe(Request $request)
    {
        $user = $this->requireUser($request);
        $allowed = [
            'name_first',
            'name_middle',
            'name_last',
            'domain_email',
            'current_rank',
            'current_salary',
            'nature_of_appointment',
            'educational_attainment',
            'eligibility_exams',
            'teaching_experience_years',
            'industry_experience_years',
            'applying_for',
            'date_of_last_promotion',
            'last_promotion_date',
            'status',
            'is_first_login',
            'educational_attainment_json',
            'eligibility_exams_json',
            'doctorate',
            'applying_for_json',
        ];

        $payload = $request->validate(array_reduce($allowed, static function (array $rules, string $field) {
            $rules[$field] = ['nullable'];
            return $rules;
        }, []));

        $update = [];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }

            $value = $payload[$field];
            if ($field === 'applying_for_json' && is_array($value)) {
                $update[$field] = json_encode(array_values($value), JSON_UNESCAPED_UNICODE);
                continue;
            }

            if (in_array($field, ['doctorate', 'educational_attainment_json', 'eligibility_exams_json'], true) && is_array($value)) {
                $update[$field] = json_encode($value, JSON_UNESCAPED_UNICODE);
                continue;
            }

            if (in_array($field, ['teaching_experience_years', 'industry_experience_years'], true) && $value !== null && $value !== '') {
                $update[$field] = (int) $value;
                continue;
            }

            if (in_array($field, ['is_first_login'], true)) {
                $update[$field] = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                continue;
            }

            $update[$field] = $value;
        }

        if (!$update) {
            return response()->json(['error' => 'No profile fields supplied.'], 422);
        }

        DB::table('users')->where('user_id', $user->user_id)->update($update);
        $profile = $this->fetchProfileRow($user->user_id);

        return response()->json([
            'user' => $this->normalizeUser($profile ?? $user),
            'profile' => $profile,
        ]);
    }

    public function cycles()
    {
        return response()->json(DB::table('ranking_cycles')->orderByDesc('created_at')->get());
    }

    public function areas()
    {
        return response()->json(DB::table('areas')->orderBy('area_id')->get());
    }

    public function positions()
    {
        return response()->json(DB::table('positions')->where('is_active', 1)->orderBy('position_id')->get());
    }

    public function notifications(Request $request)
    {
        $limit = (int) $request->integer('limit', 80);
        $limit = max(1, min($limit, 200));

        return response()->json(DB::table('notifications')->orderByDesc('created_at')->limit($limit)->get());
    }

    public function markNotificationRead(string $id)
    {
        DB::table('notifications')->where('id', $id)->update(['is_read' => true]);

        return response()->json(['ok' => true]);
    }

    public function applications(Request $request)
    {
        $validated = $request->validate([
            'faculty_id' => ['nullable', 'integer'],
            'cycle_id' => ['nullable', 'integer'],
            'limit' => ['nullable', 'integer'],
        ]);

        $query = DB::table('applications as app')
            ->join('users as faculty', 'faculty.user_id', '=', 'app.faculty_id')
            ->leftJoin('departments as dept', 'dept.department_id', '=', 'faculty.department_id')
            ->select([
                'app.*',
                'faculty.user_id as faculty_user_id',
                'faculty.name_last',
                'faculty.name_first',
                'faculty.name_middle',
                'faculty.domain_email',
                'faculty.department_id',
                'dept.department_name',
                'dept.department_code',
                'faculty.current_rank',
                'faculty.nature_of_appointment',
                'faculty.teaching_experience_years',
                'faculty.industry_experience_years',
                'faculty.applying_for',
                'faculty.applying_for_json',
                'faculty.educational_attainment',
                'faculty.educational_attainment_json',
                'faculty.eligibility_exams',
                'faculty.eligibility_exams_json',
                'faculty.date_of_last_promotion',
                'faculty.last_promotion_date',
                'faculty.doctorate',
                'faculty.status as faculty_status',
            ])
            ->orderByDesc('app.created_at');

        if (!empty($validated['faculty_id'])) {
            $query->where('app.faculty_id', (int) $validated['faculty_id']);
        }

        if (!empty($validated['cycle_id'])) {
            $query->where('app.cycle_id', (int) $validated['cycle_id']);
        }

        $limit = (int) ($validated['limit'] ?? 200);
        $limit = max(1, min($limit, 500));

        $applications = $query->limit($limit)->get()->map(fn ($row) => $this->normalizeApplicationRow($row))->values();

        return response()->json($applications);
    }

    public function createApplication(Request $request)
    {
        $user = $this->requireUser($request);
        $validated = $request->validate([
            'application_number' => ['required', 'string', 'max:255'],
            'faculty_id' => ['required', 'integer'],
            'current_rank_at_time' => ['nullable', 'string', 'max:255'],
            'target_position_id' => ['required', 'integer', Rule::exists('positions', 'position_id')],
            'cycle_id' => ['required', 'integer', Rule::exists('ranking_cycles', 'cycle_id')],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        if ((int) $validated['faculty_id'] !== (int) $user->user_id) {
            return response()->json(['error' => 'Faculty mismatch.'], 403);
        }

        $payload = [
            'application_number' => $validated['application_number'],
            'faculty_id' => (int) $validated['faculty_id'],
            'current_rank_at_time' => $validated['current_rank_at_time'] ?? null,
            'target_position_id' => (int) $validated['target_position_id'],
            'cycle_id' => (int) $validated['cycle_id'],
            'status' => $validated['status'] ?? 'Draft',
        ];

        $id = DB::table('applications')->insertGetId($payload, 'application_id');
        $row = DB::table('applications')->where('application_id', $id)->first();

        return response()->json(['application' => $this->normalizeApplicationRow($row)]);
    }

    public function updateApplication(Request $request, int $applicationId)
    {
        $validated = $request->validate([
            'current_rank_at_time' => ['nullable', 'string', 'max:255'],
            'target_position_id' => ['nullable', 'integer', Rule::exists('positions', 'position_id')],
            'cycle_id' => ['nullable', 'integer', Rule::exists('ranking_cycles', 'cycle_id')],
            'status' => ['nullable', 'string', 'max:50'],
            'hr_score' => ['nullable', 'numeric'],
            'final_score' => ['nullable', 'numeric'],
            'vpaa_comment' => ['nullable', 'string'],
        ]);

        DB::table('applications')->where('application_id', $applicationId)->update($validated);
        $row = DB::table('applications')->where('application_id', $applicationId)->first();

        return response()->json(['application' => $this->normalizeApplicationRow($row)]);
    }

    public function submissions(Request $request)
    {
        $validated = $request->validate([
            'application_id' => ['nullable', 'integer'],
            'faculty_id' => ['nullable', 'integer'],
            'user_id' => ['nullable', 'integer'],
            'cycle_id' => ['nullable', 'integer'],
            'part_id' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer'],
        ]);

        $query = DB::table('area_submissions')->orderByDesc('uploaded_at');

        $filters = [
            'application_id' => 'application_id',
            'faculty_id' => 'user_id',
            'user_id' => 'user_id',
            'cycle_id' => 'cycle_id',
            'part_id' => 'part_id',
        ];

        foreach ($filters as $requestKey => $column) {
            if (!array_key_exists($requestKey, $validated) || $validated[$requestKey] === null || $validated[$requestKey] === '') {
                continue;
            }

            $query->where($column, $validated[$requestKey]);
        }

        $limit = (int) ($validated['limit'] ?? 500);
        $limit = max(1, min($limit, 1000));

        return response()->json($query->limit($limit)->get());
    }

    public function createSubmission(Request $request)
    {
        $user = $this->requireUser($request);
        $validated = $request->validate([
            'application_id' => ['required', 'integer', Rule::exists('applications', 'application_id')],
            'area_id' => ['required', 'integer'],
            'file_path' => ['nullable', 'string', 'max:512'],
            'csv_total_average_rate' => ['nullable', 'numeric'],
            'hr_points' => ['nullable', 'numeric'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'user_id')],
            'cycle_id' => ['nullable', 'integer', Rule::exists('ranking_cycles', 'cycle_id')],
            'part_id' => ['nullable', 'string', 'max:255'],
        ]);

        $areaId = $this->normalizeFacultyAreaId((int) $validated['area_id']);
        if ($areaId === null) {
            return response()->json(['error' => 'Invalid area_id supplied for submission.'], 422);
        }

        if (!empty($validated['user_id']) && (int) $validated['user_id'] !== (int) $user->user_id) {
            return response()->json(['error' => 'Faculty mismatch.'], 403);
        }

        $userId = (int) ($validated['user_id'] ?? $user->user_id);

        $criteria = [
            'application_id' => (int) $validated['application_id'],
            'area_id' => $areaId,
            'user_id' => $userId,
        ];

        $cycleId = $validated['cycle_id'] ?? null;
        if ($cycleId === null) {
            $criteria['cycle_id'] = null;
        } else {
            $criteria['cycle_id'] = (int) $cycleId;
        }

        $partId = $validated['part_id'] ?? null;
        if ($partId === null || $partId === '') {
            $criteria['part_id'] = null;
        } else {
            $criteria['part_id'] = $partId;
        }

        $payload = [
            'application_id' => (int) $validated['application_id'],
            'area_id' => $areaId,
            'file_path' => $validated['file_path'] ?? null,
            'csv_total_average_rate' => $validated['csv_total_average_rate'] ?? null,
            'hr_points' => $validated['hr_points'] ?? 0,
            'user_id' => $userId,
            'cycle_id' => $cycleId,
            'part_id' => $partId,
        ];

        $row = DB::transaction(function () use ($criteria, $payload) {
            DB::table('area_submissions')->updateOrInsert($criteria, $payload);

            $query = DB::table('area_submissions')
                ->where('application_id', $criteria['application_id'])
                ->where('area_id', $criteria['area_id'])
                ->where('user_id', $criteria['user_id']);

            if ($criteria['cycle_id'] === null) {
                $query->whereNull('cycle_id');
            } else {
                $query->where('cycle_id', $criteria['cycle_id']);
            }

            if ($criteria['part_id'] === null) {
                $query->whereNull('part_id');
            } else {
                $query->where('part_id', $criteria['part_id']);
            }

            return $query->orderByDesc('submission_id')->first();
        });

        if (!$row) {
            return response()->json(['error' => 'Submission was saved but could not be verified.'], 500);
        }

        return response()->json(['submission' => $row]);
    }

    public function updateSubmission(Request $request, int $submissionId)
    {
        $validated = $request->validate([
            'application_id' => ['nullable', 'integer', Rule::exists('applications', 'application_id')],
            'area_id' => ['nullable', 'integer', Rule::exists('areas', 'area_id')],
            'file_path' => ['nullable', 'string', 'max:512'],
            'csv_total_average_rate' => ['nullable', 'numeric'],
            'hr_points' => ['nullable', 'numeric'],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'user_id')],
            'cycle_id' => ['nullable', 'integer', Rule::exists('ranking_cycles', 'cycle_id')],
            'part_id' => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('area_id', $validated) && $validated['area_id'] !== null) {
            $areaId = $this->normalizeFacultyAreaId((int) $validated['area_id']);
            if ($areaId === null) {
                return response()->json(['error' => 'Invalid area_id supplied for submission.'], 422);
            }

            $validated['area_id'] = $areaId;
        }

        DB::table('area_submissions')->where('submission_id', $submissionId)->update($validated);
        $row = DB::table('area_submissions')->where('submission_id', $submissionId)->first();

        return response()->json(['submission' => $row]);
    }

    public function deleteSubmission(int $submissionId)
    {
        DB::table('area_submissions')->where('submission_id', $submissionId)->delete();

        return response()->json(['ok' => true]);
    }

    private function normalizeFacultyAreaId(int $areaId): ?int
    {
        if ($areaId <= 0) {
            return null;
        }

        if (DB::table('areas')->where('area_id', $areaId)->exists()) {
            return $areaId;
        }

        if ($areaId >= 1 && $areaId <= 10) {
            $legacyAreaId = $areaId + 3;
            if (DB::table('areas')->where('area_id', $legacyAreaId)->exists()) {
                return $legacyAreaId;
            }
        }

        return null;
    }

    public function templates(Request $request)
    {
        $validated = $request->validate([
            'area_id' => ['nullable', 'integer', Rule::exists('areas', 'area_id')],
            'part_id' => ['nullable', 'string', 'max:255'],
            'limit' => ['nullable', 'integer'],
        ]);

        $query = DB::table('area_part_templates')->orderByDesc('updated_at');

        if (!empty($validated['area_id'])) {
            $query->where('area_id', (int) $validated['area_id']);
        }

        if (!empty($validated['part_id'])) {
            $query->where('part_id', $validated['part_id']);
        }

        $limit = (int) ($validated['limit'] ?? 100);
        $limit = max(1, min($limit, 200));

        return response()->json($query->limit($limit)->get());
    }

    private function requireUser(Request $request): object
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            abort(response()->json(['error' => 'Unauthorized.'], 401));
        }

        return $user;
    }

    private function resolveCurrentCycle(): ?object
    {
        $cycle = DB::table('ranking_cycles')
            ->where(function ($query) {
                $query->where('status', 'open')
                    ->orWhere('profile_edit_open', 1);
            })
            ->orderByDesc('created_at')
            ->first();

        if ($cycle) {
            return $cycle;
        }

        return DB::table('ranking_cycles')->orderByDesc('created_at')->first();
    }

    private function fetchProfileRow(int $userId): ?object
    {
        return DB::table('users')->where('user_id', $userId)->first();
    }

    private function fetchLatestApplicationForFaculty(int $facultyId, ?int $cycleId): ?object
    {
        $query = DB::table('applications')->where('faculty_id', $facultyId);
        if ($cycleId) {
            $query->where('cycle_id', $cycleId);
        }

        return $query->orderByDesc('created_at')->first();
    }

    private function normalizeUser(object $user): array
    {
        $applyingFor = $user->applying_for_json ?? $user->applying_for ?? null;
        if (is_string($applyingFor)) {
            $decoded = json_decode($applyingFor, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $applyingFor = $decoded;
            }
        }

        return [
            'id' => $user->user_id ?? null,
            'user_id' => $user->user_id ?? null,
            'email' => $user->domain_email ?? $user->email ?? null,
            'domain_email' => $user->domain_email ?? $user->email ?? null,
            'name_last' => $user->name_last ?? null,
            'name_first' => $user->name_first ?? null,
            'name_middle' => $user->name_middle ?? null,
            'role' => $user->role ?? null,
            'department_id' => $user->department_id ?? null,
            'current_rank' => $user->current_rank ?? null,
            'current_salary' => $user->current_salary ?? null,
            'nature_of_appointment' => $user->nature_of_appointment ?? null,
            'educational_attainment' => $user->educational_attainment ?? null,
            'eligibility_exams' => $user->eligibility_exams ?? null,
            'teaching_experience_years' => $user->teaching_experience_years ?? null,
            'industry_experience_years' => $user->industry_experience_years ?? null,
            'applying_for' => $applyingFor,
            'date_of_last_promotion' => $user->date_of_last_promotion ?? null,
            'last_promotion_date' => $user->last_promotion_date ?? null,
            'status' => $user->status ?? null,
            'is_first_login' => (bool) ($user->is_first_login ?? false),
        ];
    }

    private function normalizeApplicationRow(object|string|null $row): ?array
    {
        if (!$row) {
            return null;
        }

        $row = (array) $row;
        return [
            'id' => $row['application_id'] ?? null,
            'application_id' => $row['application_id'] ?? null,
            'application_number' => $row['application_number'] ?? null,
            'faculty_id' => $row['faculty_id'] ?? null,
            'current_rank_at_time' => $row['current_rank_at_time'] ?? null,
            'target_position_id' => $row['target_position_id'] ?? null,
            'cycle_id' => $row['cycle_id'] ?? null,
            'status' => $row['status'] ?? null,
            'hr_score' => $row['hr_score'] ?? null,
            'final_score' => $row['final_score'] ?? null,
            'vpaa_comment' => $row['vpaa_comment'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'qual_experience' => $row['qual_experience'] ?? null,
            'qual_degree' => $row['qual_degree'] ?? null,
            'qual_teaching' => $row['qual_teaching'] ?? null,
            'qual_research' => $row['qual_research'] ?? null,
            'qual_eligibility' => $row['qual_eligibility'] ?? null,
        ];
    }
}