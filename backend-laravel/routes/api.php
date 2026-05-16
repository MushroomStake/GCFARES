<?php

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