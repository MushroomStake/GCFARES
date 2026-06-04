<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FacultyPortalController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\StorageController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// A pure test endpoint to verify our encryption layer works
Route::post('/test-encryption', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => 'The Laravel middleware successfully decrypted your payload!',
        'you_sent' => $request->all(), // Returns the decrypted data back to you
    ]);
});

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login', 'login')->middleware('throttle:5,1');
    Route::get('/validate', 'validateToken')->middleware('api.token');
    Route::post('/logout', 'logout')->middleware('api.token');
    Route::post('/change-password', 'changePassword')->middleware('api.token');
});

Route::prefix('database')->controller(DatabaseController::class)->group(function () {
    Route::post('/query', 'query');
});

Route::prefix('faculty')->middleware('api.token')->controller(FacultyPortalController::class)->group(function () {
    Route::get('/bootstrap', 'bootstrap');
    Route::get('/me', 'me');
    Route::patch('/me', 'updateMe');
    Route::get('/cycles', 'cycles');
    Route::get('/areas', 'areas');
    Route::get('/positions', 'positions');
    Route::get('/notifications', 'notifications');
    Route::patch('/notifications/{id}', 'markNotificationRead');
    Route::get('/applications', 'applications');
    Route::post('/applications', 'createApplication');
    Route::patch('/applications/{applicationId}', 'updateApplication');
    Route::get('/submissions', 'submissions');
    Route::post('/submissions', 'createSubmission');
    Route::patch('/submissions/{submissionId}', 'updateSubmission');
    Route::delete('/submissions/{submissionId}', 'deleteSubmission');
    Route::get('/templates', 'templates');
});

Route::prefix('storage')->middleware('api.token')->controller(StorageController::class)->group(function () {
    Route::post('/upload', 'upload');
    Route::post('/signed-url', 'signedUrl');
});