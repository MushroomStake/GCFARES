<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $email = trim($validated['email']);
        if (!str_contains($email, '@')) {
            $email = $email . '@gordoncollege.edu.ph';
        }

        $userQuery = DB::table('users')->where(function ($query) use ($email) {
            if (Schema::hasColumn('users', 'domain_email')) {
                $query->orWhere('domain_email', $email);
            }

            if (Schema::hasColumn('users', 'email')) {
                $query->orWhere('email', $email);
            }
        });

        $user = $userQuery->first();

        if (!$user) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $hash = $user->password_hash ?? $user->password ?? null;
        if (!$hash || !Hash::check($validated['password'], $hash)) {
            return response()->json(['error' => 'Invalid credentials'], 401);
        }

        $token = bin2hex(random_bytes(32));
        Cache::store('file')->put('api_token_' . $token, $user->user_id, now()->addDay());

        return response()->json([
            'token' => $token,
            'user' => $this->normalizeUser($user),
        ]);
    }

    public function validateToken(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['valid' => false], 401);
        }

        return response()->json([
            'valid' => true,
            'user' => $this->normalizeUser($user),
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['error' => 'Unauthorized.'], 401);
        }

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8'],
        ]);

        $hash = $user->password_hash ?? $user->password ?? null;
        if (!$hash || !Hash::check($validated['current_password'], $hash)) {
            return response()->json(['error' => 'Current password is incorrect.'], 422);
        }

        DB::table('users')
            ->where('user_id', $user->user_id)
            ->update([
                'password_hash' => Hash::make($validated['new_password']),
                'is_first_login' => false,
            ]);

        $updatedUser = DB::table('users')->where('user_id', $user->user_id)->first();

        return response()->json([
            'ok' => true,
            'user' => $this->normalizeUser($updatedUser),
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(['error' => 'Unauthorized. Bearer token is required.'], 401);
        }

        Cache::store('file')->forget('api_token_' . $token);

        return response()->json(['ok' => true]);
    }

    private function normalizeUser(object $user): array
    {
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
            'applying_for' => $user->applying_for ?? null,
            'date_of_last_promotion' => $user->date_of_last_promotion ?? null,
            'last_promotion_date' => $user->last_promotion_date ?? null,
            'status' => $user->status ?? null,
            'is_first_login' => (bool) ($user->is_first_login ?? false),
        ];
    }
}
