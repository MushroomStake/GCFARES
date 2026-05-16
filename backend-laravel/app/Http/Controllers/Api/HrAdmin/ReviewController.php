<?php

namespace App\Http\Controllers\Api\HrAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ReviewController extends Controller
{
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

    public function departments()
    {
        $departments = DB::table('departments')
            ->select('department_id', 'department_name', 'department_code')
            ->orderBy('department_code')
            ->orderBy('department_name')
            ->get();

        return response()->json($departments);
    }

    public function areas()
    {
        $areas = DB::table('areas')
            ->select('area_id', 'area_name', 'description', 'max_possible_points')
            ->orderBy('area_id')
            ->get();

        return response()->json($areas);
    }

    public function participants(int $cycleId)
    {
        $participants = DB::table('cycle_participants')
            ->select('*')
            ->where('cycle_id', $cycleId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($participants);
    }

    public function applications(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => ['nullable', 'integer', 'exists:ranking_cycles,cycle_id'],
        ]);

        $cycleId = $validated['cycle_id'] ?? DB::table('ranking_cycles')->orderByDesc('created_at')->value('cycle_id');

        if (!$cycleId) {
            return response()->json([]);
        }

        $applications = DB::table('applications as app')
            ->join('users as faculty', 'faculty.user_id', '=', 'app.faculty_id')
            ->leftJoin('departments as dept', 'dept.department_id', '=', 'faculty.department_id')
            ->where('app.cycle_id', $cycleId)
            ->select([
                'app.application_id',
                'app.application_number',
                'app.faculty_id',
                'app.current_rank_at_time',
                'app.target_position_id',
                'app.cycle_id',
                'app.status',
                'app.hr_score',
                'app.final_score',
                'app.vpaa_comment',
                'app.hr_completed_at',
                'app.vpaa_completed_at',
                'app.created_at',
                'app.qual_experience',
                'app.qual_degree',
                'app.qual_teaching',
                'app.qual_research',
                'app.qual_eligibility',
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
                'faculty.doctorate',
                'faculty.status as faculty_status',
            ])
            ->orderByDesc('app.created_at')
            ->get();

        $applicationIds = $applications->pluck('application_id')->all();
        $submissionCounts = [];
        $fallbackScores = [];

        if (!empty($applicationIds)) {
            $submissionRows = DB::table('area_submissions')
                ->select('application_id', 'hr_points')
                ->where('cycle_id', $cycleId)
                ->whereIn('application_id', $applicationIds)
                ->get();

            foreach ($submissionRows as $row) {
                $applicationId = (int) $row->application_id;
                $submissionCounts[$applicationId] = ($submissionCounts[$applicationId] ?? 0) + 1;
                $fallbackScores[$applicationId] = ($fallbackScores[$applicationId] ?? 0) + (float) ($row->hr_points ?? 0);
            }
        }

        $payload = $applications->map(function ($row) use ($submissionCounts, $fallbackScores) {
            $faculty = [
                'user_id' => $row->faculty_user_id,
                'name_last' => $row->name_last,
                'name_first' => $row->name_first,
                'name_middle' => $row->name_middle,
                'domain_email' => $row->domain_email,
                'department_id' => $row->department_id,
                'department' => $row->department_code ?? $row->department_id,
                'department_name' => $row->department_name ?? 'Unknown',
                'department_code' => $row->department_code,
                'current_rank' => $row->current_rank,
                'nature_of_appointment' => $row->nature_of_appointment,
                'teaching_experience_years' => $row->teaching_experience_years,
                'industry_experience_years' => $row->industry_experience_years,
                'applying_for' => $row->applying_for,
                'applying_for_json' => $row->applying_for_json,
                'educational_attainment' => $row->educational_attainment,
                'educational_attainment_json' => $row->educational_attainment_json,
                'eligibility_exams' => $row->eligibility_exams,
                'eligibility_exams_json' => $row->eligibility_exams_json,
                'doctorate' => $row->doctorate,
                'status' => $row->faculty_status,
            ];

            $fallbackScore = $fallbackScores[$row->application_id] ?? null;
            $displayScore = $row->final_score ?? $row->hr_score ?? $fallbackScore ?? null;

            return [
                'id' => $row->application_id,
                'application_id' => $row->application_id,
                'application_number' => $row->application_number,
                'faculty_id' => $row->faculty_id,
                'current_rank_at_time' => $row->current_rank_at_time,
                'target_position_id' => $row->target_position_id,
                'cycle_id' => $row->cycle_id,
                'status' => $row->status,
                'hr_score' => $row->hr_score,
                'final_score' => $row->final_score,
                'vpaa_comment' => $row->vpaa_comment,
                'hr_completed_at' => $row->hr_completed_at,
                'vpaa_completed_at' => $row->vpaa_completed_at,
                'created_at' => $row->created_at,
                'qual_experience' => $row->qual_experience,
                'qual_degree' => $row->qual_degree,
                'qual_teaching' => $row->qual_teaching,
                'qual_research' => $row->qual_research,
                'qual_eligibility' => $row->qual_eligibility,
                'display_score' => $displayScore,
                'submission_count' => $submissionCounts[$row->application_id] ?? 0,
                'fallback_score' => $fallbackScore,
                'faculty' => $faculty,
            ];
        })->values();

        return response()->json($payload);
    }

    public function submissions(int $applicationId)
    {
        $rows = DB::table('area_submissions as s')
            ->join('areas as a', 'a.area_id', '=', 's.area_id')
            ->where('s.application_id', $applicationId)
            ->select(
                's.*',
                'a.area_name',
                'a.description',
                'a.max_possible_points'
            )
            ->orderBy('a.area_id')
            ->orderByRaw('COALESCE(s.part_id, "") ASC')
            ->orderByDesc('s.uploaded_at')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => $row->submission_id,
                    'submission_id' => $row->submission_id,
                    'application_id' => $row->application_id,
                    'area_id' => $row->area_id,
                    'file_path' => $row->file_path,
                    'csv_total_average_rate' => $row->csv_total_average_rate,
                    'hr_points' => $row->hr_points,
                    'uploaded_at' => $row->uploaded_at,
                    'user_id' => $row->user_id,
                    'cycle_id' => $row->cycle_id,
                    'part_id' => $row->part_id,
                    'vpaa_points' => $row->vpaa_points ?? null,
                    'area' => [
                        'area_id' => $row->area_id,
                        'area_name' => $row->area_name,
                        'description' => $row->description,
                        'max_possible_points' => $row->max_possible_points,
                    ],
                ];
            });

        return response()->json($rows);
    }

    public function updateApplication(Request $request, int $applicationId)
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:255'],
            'hr_score' => ['nullable', 'numeric'],
            'final_score' => ['nullable', 'numeric'],
            'vpaa_comment' => ['nullable', 'string'],
            'hr_completed_at' => ['nullable', 'date'],
            'vpaa_completed_at' => ['nullable', 'date'],
            'qual_experience' => ['nullable', 'string'],
            'qual_degree' => ['nullable', 'string'],
            'qual_teaching' => ['nullable', 'string'],
            'qual_research' => ['nullable', 'string'],
            'qual_eligibility' => ['nullable', 'string'],
        ]);

        DB::table('applications')
            ->where('application_id', $applicationId)
            ->update(array_filter($validated, static fn ($value) => $value !== null));

        $updated = DB::table('applications')->where('application_id', $applicationId)->first();

        return response()->json($updated);
    }

    public function upsertAreaScore(Request $request)
    {
        $validated = $request->validate([
            'application_id' => ['required', 'integer', 'exists:applications,application_id'],
            'area_id' => ['required', 'integer', 'exists:areas,area_id'],
            'cycle_id' => ['required', 'integer', 'exists:ranking_cycles,cycle_id'],
            'part_id' => ['nullable', 'string', 'max:255'],
            'submission_id' => ['nullable', 'integer', 'exists:area_submissions,submission_id'],
            'hr_points' => ['required', 'numeric'],
            'csv_total_average_rate' => ['nullable', 'numeric'],
            'file_path' => ['nullable', 'string', 'max:512'],
        ]);

        $match = null;

        if (!empty($validated['submission_id'])) {
            $match = DB::table('area_submissions')
                ->where('submission_id', $validated['submission_id'])
                ->first();
        }

        if (!$match) {
            $query = DB::table('area_submissions')
                ->where('application_id', $validated['application_id'])
                ->where('area_id', $validated['area_id'])
                ->where('cycle_id', $validated['cycle_id']);

            if (array_key_exists('part_id', $validated) && $validated['part_id'] !== null && $validated['part_id'] !== '') {
                $query->where('part_id', $validated['part_id']);
            } else {
                $query->whereNull('part_id');
            }

            $match = $query->first();
        }

        $payload = [
            'application_id' => $validated['application_id'],
            'area_id' => $validated['area_id'],
            'cycle_id' => $validated['cycle_id'],
            'part_id' => $validated['part_id'] ?? null,
            'hr_points' => $validated['hr_points'],
            'csv_total_average_rate' => $validated['csv_total_average_rate'] ?? null,
            'file_path' => $validated['file_path'] ?? null,
            'uploaded_at' => now(),
        ];

        if ($match) {
            DB::table('area_submissions')
                ->where('submission_id', $match->submission_id)
                ->update($payload);

            $submissionId = $match->submission_id;
        } else {
            $payload['user_id'] = DB::table('applications')->where('application_id', $validated['application_id'])->value('faculty_id');
            $submissionId = DB::table('area_submissions')->insertGetId($payload, 'submission_id');
        }

        $totalScore = (float) DB::table('area_submissions')
            ->where('application_id', $validated['application_id'])
            ->sum('hr_points');

        DB::table('applications')
            ->where('application_id', $validated['application_id'])
            ->update(['hr_score' => $totalScore]);

        $submission = DB::table('area_submissions as s')
            ->join('areas as a', 'a.area_id', '=', 's.area_id')
            ->where('s.submission_id', $submissionId)
            ->select('s.*', 'a.area_name', 'a.description', 'a.max_possible_points')
            ->first();

        return response()->json([
            'submission' => $submission,
            'totalScore' => $totalScore,
            'application' => DB::table('applications')->where('application_id', $validated['application_id'])->first(),
        ]);
    }

    public function latestAreaIvImport(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => ['required', 'integer', 'exists:ranking_cycles,cycle_id'],
            'application_id' => ['required', 'integer', 'exists:applications,application_id'],
        ]);

        $row = DB::table('area_iv_student_evaluation_imports')
            ->where('cycle_id', $validated['cycle_id'])
            ->where('matched_application_id', $validated['application_id'])
            ->orderByDesc('created_at')
            ->first();

        return response()->json($row);
    }

    public function submissionScoring(Request $request, string $submissionId)
    {
        $submission = DB::table('area_submissions as s')
            ->join('areas as a', 'a.area_id', '=', 's.area_id')
            ->where('s.submission_id', $submissionId)
            ->select('s.*', 'a.area_name', 'a.description', 'a.max_possible_points')
            ->first();

        if (!$submission) {
            return response()->json(['message' => 'Submission not found.'], 404);
        }

        $criteria = DB::table('area_submission_criterion_scores')
            ->where('submission_id', $submissionId)
            ->orderBy('criterion_key')
            ->get();

        $totalScore = (float) $criteria->sum(function ($row) {
            $value = $row->capped_score;
            if ($value === null) {
                $value = $row->score;
            }

            return (float) $value;
        });

        return response()->json([
            'submission' => $submission,
            'area' => [
                'area_id' => $submission->area_id,
                'area_name' => $submission->area_name,
                'description' => $submission->description,
                'max_possible_points' => $submission->max_possible_points,
            ],
            'criteria' => $criteria,
            'totalScore' => $totalScore,
        ]);
    }

    public function updateSubmissionScoring(Request $request, string $submissionId)
    {
        $validated = $request->validate([
            'criteria' => ['required', 'array'],
            'criteria.*.criterion_key' => ['required', 'string', 'max:255'],
            'criteria.*.label' => ['nullable', 'string', 'max:255'],
            'criteria.*.title' => ['nullable', 'string'],
            'criteria.*.maxPoints' => ['nullable', 'numeric'],
            'criteria.*.score' => ['nullable', 'numeric'],
            'criteria.*.cappedScore' => ['nullable', 'numeric'],
            'criteria.*.excessScore' => ['nullable', 'numeric'],
            'context' => ['nullable', 'array'],
            'context.application_id' => ['nullable', 'integer', 'exists:applications,application_id'],
            'context.area_id' => ['nullable', 'integer', 'exists:areas,area_id'],
            'context.cycle_id' => ['nullable', 'integer', 'exists:ranking_cycles,cycle_id'],
            'context.part_id' => ['nullable', 'string', 'max:255'],
            'context.user_id' => ['nullable', 'integer', 'exists:users,user_id'],
            'context.file_path' => ['nullable', 'string', 'max:512'],
            'context.csv_total_average_rate' => ['nullable', 'numeric'],
        ]);

        $submission = null;
        if (is_numeric($submissionId)) {
            $submission = DB::table('area_submissions')
                ->where('submission_id', (int) $submissionId)
                ->first();
        }

        $context = $validated['context'] ?? [];
        if (!$submission) {
            $query = DB::table('area_submissions');

            if (!empty($context['application_id'])) {
                $query->where('application_id', $context['application_id']);
            }
            if (!empty($context['area_id'])) {
                $query->where('area_id', $context['area_id']);
            }
            if (!empty($context['cycle_id'])) {
                $query->where('cycle_id', $context['cycle_id']);
            }
            if (array_key_exists('part_id', $context)) {
                if ($context['part_id'] === null || $context['part_id'] === '') {
                    $query->whereNull('part_id');
                } else {
                    $query->where('part_id', $context['part_id']);
                }
            }
            if (!empty($context['user_id'])) {
                $query->where('user_id', $context['user_id']);
            }

            $submission = $query->orderByDesc('uploaded_at')->first();
        }

        if (!$submission) {
            if (empty($context['application_id']) || empty($context['area_id']) || empty($context['cycle_id'])) {
                return response()->json(['message' => 'Submission context is required to create a scoring row.'], 422);
            }

            $submissionId = DB::table('area_submissions')->insertGetId([
                'application_id' => $context['application_id'],
                'area_id' => $context['area_id'],
                'cycle_id' => $context['cycle_id'],
                'part_id' => $context['part_id'] ?? null,
                'user_id' => $context['user_id'] ?? DB::table('applications')->where('application_id', $context['application_id'])->value('faculty_id'),
                'file_path' => $context['file_path'] ?? null,
                'csv_total_average_rate' => $context['csv_total_average_rate'] ?? null,
                'hr_points' => 0,
                'uploaded_at' => now(),
            ], 'submission_id');

            $submission = DB::table('area_submissions')
                ->where('submission_id', $submissionId)
                ->first();
        }

        $now = now();
        $criteriaRows = collect($validated['criteria'])
            ->map(function (array $criterion) use ($submission, $now) {
                $score = (float) ($criterion['score'] ?? 0);
                $cappedScore = array_key_exists('cappedScore', $criterion) && $criterion['cappedScore'] !== null
                    ? (float) $criterion['cappedScore']
                    : $score;

                return [
                    'submission_id' => $submission->submission_id,
                    'application_id' => $submission->application_id,
                    'area_id' => $submission->area_id,
                    'part_id' => $submission->part_id,
                    'criterion_key' => $criterion['criterion_key'],
                    'criterion_label' => $criterion['label'] ?? $criterion['criterion_key'],
                    'criterion_title' => $criterion['title'] ?? null,
                    'criterion_max_points' => (float) ($criterion['maxPoints'] ?? 0),
                    'score' => $score,
                    'capped_score' => $cappedScore,
                    'excess_score' => (float) ($criterion['excessScore'] ?? max(0, $score - $cappedScore)),
                    'reviewed_at' => $now,
                    'reviewed_by' => null,
                    'notes' => null,
                ];
            })
            ->values();

        foreach ($criteriaRows as $row) {
            DB::table('area_submission_criterion_scores')->updateOrInsert(
                [
                    'submission_id' => $row['submission_id'],
                    'criterion_key' => $row['criterion_key'],
                ],
                $row
            );
        }

        $totalScore = (float) DB::table('area_submission_criterion_scores')
            ->where('submission_id', $submission->submission_id)
            ->sum(DB::raw('COALESCE(capped_score, score, 0)'));

        DB::table('area_submissions')
            ->where('submission_id', $submission->submission_id)
            ->update([
                'hr_points' => $totalScore,
                'csv_total_average_rate' => $context['csv_total_average_rate'] ?? $submission->csv_total_average_rate,
                'file_path' => $context['file_path'] ?? $submission->file_path,
            ]);

        $applicationId = (int) $submission->application_id;
        $applicationTotal = (float) DB::table('area_submissions')
            ->where('application_id', $applicationId)
            ->sum('hr_points');

        DB::table('applications')
            ->where('application_id', $applicationId)
            ->update(['hr_score' => $applicationTotal]);

        $updatedSubmission = DB::table('area_submissions as s')
            ->join('areas as a', 'a.area_id', '=', 's.area_id')
            ->where('s.submission_id', $submission->submission_id)
            ->select('s.*', 'a.area_name', 'a.description', 'a.max_possible_points')
            ->first();

        return response()->json([
            'submission' => $updatedSubmission,
            'criteria' => DB::table('area_submission_criterion_scores')
                ->where('submission_id', $submission->submission_id)
                ->orderBy('criterion_key')
                ->get(),
            'totalScore' => $totalScore,
            'application' => DB::table('applications')->where('application_id', $applicationId)->first(),
        ]);
    }

    public function areaIvImports(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => ['nullable', 'integer'],
        ]);

        $query = DB::table('area_iv_student_evaluation_imports');
        if (!empty($validated['cycle_id'])) {
            $query->where('cycle_id', $validated['cycle_id']);
        } else {
            $latestCycleId = $query->orderByDesc('created_at')->value('cycle_id');
            if ($latestCycleId) {
                $query = DB::table('area_iv_student_evaluation_imports')->where('cycle_id', $latestCycleId);
            }
        }

        $rows = $query->orderBy('created_at')->get();

        return response()->json($rows);
    }

    public function replaceAreaIvImports(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => ['required', 'integer', 'exists:ranking_cycles,cycle_id'],
            'rows' => ['required', 'array'],
            'rows.*.employee_name' => ['required', 'string'],
            'rows.*.normalized_name' => ['required', 'string'],
            'rows.*.total_average_rate' => ['required', 'numeric'],
            'rows.*.matched_application_id' => ['nullable', 'integer', 'exists:applications,application_id'],
            'rows.*.matched_faculty_id' => ['nullable', 'integer', 'exists:users,user_id'],
            'rows.*.source_file_name' => ['nullable', 'string'],
            'rows.*.source_row_number' => ['nullable', 'integer'],
        ]);

        DB::table('area_iv_student_evaluation_imports')
            ->where('cycle_id', $validated['cycle_id'])
            ->delete();

        $payload = collect($validated['rows'])
            ->map(function (array $row) use ($validated) {
                return [
                    'cycle_id' => $validated['cycle_id'],
                    'employee_name' => $row['employee_name'],
                    'normalized_name' => $row['normalized_name'],
                    'total_average_rate' => $row['total_average_rate'],
                    'matched_application_id' => $row['matched_application_id'] ?? null,
                    'matched_faculty_id' => $row['matched_faculty_id'] ?? null,
                    'source_file_name' => $row['source_file_name'] ?? null,
                    'source_row_number' => $row['source_row_number'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->all();

        if (!empty($payload)) {
            DB::table('area_iv_student_evaluation_imports')->insert($payload);
        }

        return response()->json([
            'rows' => DB::table('area_iv_student_evaluation_imports')
                ->where('cycle_id', $validated['cycle_id'])
                ->orderBy('created_at')
                ->get(),
        ]);
    }

    public function updateAreaIvImport(Request $request, int $importId)
    {
        $validated = $request->validate([
            'matched_application_id' => ['nullable', 'integer', 'exists:applications,application_id'],
            'matched_faculty_id' => ['nullable', 'integer', 'exists:users,user_id'],
        ]);

        DB::table('area_iv_student_evaluation_imports')
            ->where('import_id', $importId)
            ->update(array_filter($validated, static fn ($value) => $value !== null));

        return response()->json(
            DB::table('area_iv_student_evaluation_imports')->where('import_id', $importId)->first()
        );
    }

    public function deleteAreaIvImports(Request $request)
    {
        $validated = $request->validate([
            'cycle_id' => ['required', 'integer', 'exists:ranking_cycles,cycle_id'],
        ]);

        DB::table('area_iv_student_evaluation_imports')
            ->where('cycle_id', $validated['cycle_id'])
            ->delete();

        return response()->json(['deleted' => true]);
    }

    public function storagePublicUrl(Request $request)
    {
        $validated = $request->validate([
            'path' => ['required', 'string', 'max:512'],
            'bucket' => ['nullable', 'string', 'max:255'],
        ]);

        $path = ltrim($validated['path'], '/');
        $bucket = $validated['bucket'] ?? 'public';

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return response()->json(['url' => $path]);
        }

        if ($bucket === 'public') {
            return response()->json(['url' => Storage::disk('public')->url($path)]);
        }

        return response()->json(['url' => url('/storage/' . $path)]);
    }

    public function templates(Request $request)
    {
        $rows = DB::table('area_part_templates')->where('is_active', true)->get();
        return response()->json($rows);
    }

    public function updateCycle(Request $request, int $cycleId)
    {
        $validated = $request->validate([
            'profile_edit_open' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string'],
            'title' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
        ]);

        DB::table('ranking_cycles')
            ->where('cycle_id', $cycleId)
            ->update(array_filter($validated, static fn ($v) => $v !== null));

        return response()->json(DB::table('ranking_cycles')->where('cycle_id', $cycleId)->first());
    }

    public function createCycle(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string'],
            'year' => ['required', 'string'],
            'semester' => ['required', 'string'],
            'start_date' => ['required', 'date'],
            'deadline' => ['required', 'date'],
            'status' => ['nullable', 'string'],
            'profile_edit_open' => ['nullable', 'boolean'],
            'created_by' => ['required', 'integer', 'exists:users,user_id'],
            'created_at' => ['nullable', 'date']
        ]);

        $payload = [
            'title' => $validated['title'],
            'year' => $validated['year'],
            'semester' => $validated['semester'],
            'start_date' => $validated['start_date'],
            'deadline' => $validated['deadline'],
            'status' => $validated['status'] ?? 'open',
            'profile_edit_open' => $validated['profile_edit_open'] ?? true,
            'created_by' => $validated['created_by'],
            'created_at' => $validated['created_at'] ?? now(),
        ];

        $id = DB::table('ranking_cycles')->insertGetId($payload, 'cycle_id');

        // Reset 'ranking' users to 'inactive' as the frontend previously did
        DB::table('users')->where('status', 'ranking')->update(['status' => 'inactive']);

        return response()->json(DB::table('ranking_cycles')->where('cycle_id', $id)->first());
    }

    public function finalizeCycle(Request $request, int $cycleId)
    {
        // Finalize: set cycle status finished, close profile editing, reset users and participants
        DB::beginTransaction();
        try {
            DB::table('ranking_cycles')
                ->where('cycle_id', $cycleId)
                ->update(['status' => 'finished', 'profile_edit_open' => false]);

            DB::table('users')
                ->where('status', 'ranking')
                ->update(['status' => 'inactive']);

            DB::table('cycle_participants')
                ->where('cycle_id', $cycleId)
                ->whereIn('status', ['invited', 'accepted'])
                ->update(['status' => 'removed']);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Could not finalize cycle', 'details' => $e->getMessage()], 500);
        }

        return response()->json(['ok' => true]);
    }

    public function uploadTemplate(Request $request)
    {
        $validated = $request->validate([
            'area_id' => ['required', 'integer', 'exists:areas,area_id'],
            'part_id' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:5120'], // max 5MB
        ]);

        $file = $request->file('file');
        $areaId = $validated['area_id'];
        $partId = $validated['part_id'];

        // Build a sensible storage path under public disk
        $areaFolder = 'Templates/Area ' . str_pad((string) $areaId, 2, '0', STR_PAD_LEFT);
        $partFolder = 'Part ' . strtoupper(substr($partId, 0, 1));
        $fileName = 'template.' . $file->getClientOriginalExtension();
        $storagePath = trim($areaFolder . '/' . $partFolder . '/' . $fileName, '/');

        // Store file on public disk
        $stream = fopen($file->getPathname(), 'r');
        Storage::disk('public')->put($storagePath, $stream);
        if (is_resource($stream)) fclose($stream);

        // Upsert DB record
        $record = [
            'area_id' => $areaId,
            'part_id' => $partId,
            'part_label' => null,
            'part_title' => null,
            'storage_bucket' => 'public',
            'storage_path' => $storagePath,
            'file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'file_size_bytes' => $file->getSize(),
            'template_kind' => strtolower($file->getClientOriginalExtension()),
            'is_active' => true,
            'updated_at' => now(),
        ];

        DB::table('area_part_templates')->updateOrInsert([
            'area_id' => $areaId,
            'part_id' => $partId,
        ], $record + ['created_at' => now()]);

        return response()->json([
            'storage_path' => $storagePath,
            'url' => Storage::disk('public')->url($storagePath),
            'file_name' => $file->getClientOriginalName(),
        ]);
    }
}