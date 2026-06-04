<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DatabaseController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// A pure test endpoint to verify our encryption layer works
Route::post('/test-encryption', function (Request $request) {
    return response()->json([
        'status' => 'success',
        'message' => 'The Laravel middleware successfully decrypted your payload!',
        'you_sent' => $request->all() // Returns the decrypted data back to you
    ]);
});

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login', 'login')->middleware('throttle:10,1');
    Route::get('/validate', 'validateToken')->middleware('api.token');
    Route::post('/logout', 'logout')->middleware('api.token');
    Route::post('/change-password', 'changePassword')->middleware('api.token');
});

Route::middleware('api.token')->prefix('database')->controller(DatabaseController::class)->group(function () {
    Route::post('/query', 'query');
});