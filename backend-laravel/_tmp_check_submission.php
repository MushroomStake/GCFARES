<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\FacultyPortalController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$user = DB::table('users')->where('user_id', 16)->first();
$application = DB::table('applications')->where('application_id', 6)->first();

if (!$user || !$application) {
    echo json_encode(['error' => 'Missing test user or application record.'], JSON_PRETTY_PRINT), PHP_EOL;
    exit(1);
}

$beforeCount = DB::table('area_submissions')->where('application_id', 6)->where('user_id', 16)->where('cycle_id', 3)->where('part_id', 'I-C')->count();

$request = Request::create('/api/faculty/submissions', 'POST', [
    'application_id' => 6,
    'area_id' => 4,
    'file_path' => 'Faculty/Area 01/Part C/current-period/16/1779257026932_Sancon.JohnCarlossssssss.AreaI.PartC.pdf',
    'csv_total_average_rate' => null,
    'hr_points' => 0,
    'user_id' => 16,
    'cycle_id' => 3,
    'part_id' => 'I-C',
]);
$request->attributes->set('auth_user', $user);

$controller = $app->make(FacultyPortalController::class);
$response = $controller->createSubmission($request);
$responseData = method_exists($response, 'getData') ? $response->getData(true) : null;

$afterCount = DB::table('area_submissions')->where('application_id', 6)->where('user_id', 16)->where('cycle_id', 3)->where('part_id', 'I-C')->count();

echo json_encode([
    'before_count' => $beforeCount,
    'after_count' => $afterCount,
    'response' => $responseData,
    'latest_rows' => DB::table('area_submissions')
        ->where('application_id', 6)
        ->where('user_id', 16)
        ->where('cycle_id', 3)
        ->where('part_id', 'I-C')
        ->orderByDesc('submission_id')
        ->limit(3)
        ->get(),
], JSON_PRETTY_PRINT), PHP_EOL;
