<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DatabaseController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login', 'login')->middleware('throttle:10,1');
    Route::get('/validate', 'validateToken')->middleware('api.token');
    Route::post('/logout', 'logout')->middleware('api.token');
    Route::post('/change-password', 'changePassword')->middleware('api.token');
});

Route::middleware('api.token')->prefix('database')->controller(DatabaseController::class)->group(function () {
    Route::post('/query', 'query');
});