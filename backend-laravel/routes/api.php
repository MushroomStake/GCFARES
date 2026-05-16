<?php

use App\Http\Controllers\Api\HrAdmin\ReviewController;
use App\Http\Controllers\Api\HrAdmin\UserManagementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// A pure test endpoint to verify our encryption layer works
Route::post('/test-encryption', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => 'The Laravel middleware successfully decrypted your payload!',
        'you_sent' => $request->all() // Returns the decrypted data back to you
    ]);
});

Route::prefix('hr')->controller(UserManagementController::class)->group(function () {
    Route::get('/users', 'index');
    Route::post('/users', 'store');
    Route::put('/users/{userId}', 'update');
    Route::put('/users/{userId}/status', 'updateStatus');
    Route::post('/users/{userId}/archive', 'archive');

    Route::get('/departments', 'departments');
    Route::get('/cycles', 'cycles');
    Route::get('/cycles/{cycleId}/participants', 'participants');
    Route::patch('/cycles/{cycleId}', 'updateCycle');
    Route::post('/cycles/{cycleId}/finalize', 'finalizeCycle');
    Route::post('/cycles', 'createCycle');
    Route::post('/cycles/{cycleId}/participants', 'upsertParticipant');
    Route::delete('/cycles/{cycleId}/participants/{facultyId}', 'removeParticipant');
});

Route::prefix('review')->controller(ReviewController::class)->group(function () {
    Route::get('/cycles', 'cycles');
    Route::get('/departments', 'departments');
    Route::get('/areas', 'areas');
    Route::get('/cycles/{cycleId}/participants', 'participants');
    Route::get('/applications', 'applications');
    Route::get('/applications/{applicationId}/submissions', 'submissions');
    Route::patch('/applications/{applicationId}', 'updateApplication');
    Route::post('/area-scores', 'upsertAreaScore');
    Route::get('/area-iv-imports/latest', 'latestAreaIvImport');
    Route::get('/area-iv-imports', 'areaIvImports');
    Route::post('/area-iv-imports', 'replaceAreaIvImports');
    Route::patch('/area-iv-imports/{importId}', 'updateAreaIvImport');
    Route::delete('/area-iv-imports', 'deleteAreaIvImports');
    Route::get('/submission-scoring/{submissionId}', 'submissionScoring');
    Route::patch('/submission-scoring/{submissionId}', 'updateSubmissionScoring');
    Route::post('/submission-scoring/{submissionId}', 'updateSubmissionScoring');
    Route::get('/storage-url', 'storagePublicUrl');
    Route::get('/templates', 'templates');
    Route::post('/templates/upload', 'uploadTemplate');
});

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login', 'login');
    Route::post('/validate', 'validateToken');
    Route::post('/logout', 'logout');
});