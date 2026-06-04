<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/api', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'HR Admin API is reachable.',
    ]);
});
