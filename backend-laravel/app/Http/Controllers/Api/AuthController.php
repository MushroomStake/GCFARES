<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $email = $validated['email'];
        if (!str_contains($email, '@')) {
            $email = $email . '@gordoncollege.edu.ph';
        }

        $user = DB::table('users')->where('domain_email', $email)->first();
        if (!$user) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $hash = $user->password_hash ?? $user->password ?? null;
        if (!$hash || !Hash::check($validated['password'], $hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $token = bin2hex(random_bytes(32));
        Cache::put('api_token_'.$token, $user->user_id, 60 * 60 * 24);

        return response()->json([
            'token' => $token,
            'user' => [
                'user_id' => $user->user_id,
                'domain_email' => $user->domain_email,
                'name_last' => $user->name_last,
                'name_first' => $user->name_first,
            ],
        ]);
    }

    public function validateToken(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        $token = $validated['token'];
        $userId = Cache::get('api_token_'.$token);
        if (!$userId) {
            return response()->json(['valid' => false], 401);
        }

        $user = DB::table('users')->where('user_id', $userId)->first();
        if (!$user) {
            return response()->json(['valid' => false], 401);
        }

        return response()->json([
            'valid' => true,
            'user' => [
                'user_id' => $user->user_id,
                'domain_email' => $user->domain_email,
                'name_last' => $user->name_last,
                'name_first' => $user->name_first,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
        ]);

        Cache::forget('api_token_'.$validated['token']);
        return response()->json(['ok' => true]);
    }
}
