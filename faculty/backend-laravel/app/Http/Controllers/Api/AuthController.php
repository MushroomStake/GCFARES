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
        $applyingFor = $this->userValue($user, 'applying_for_json') ?? $this->userValue($user, 'applying_for') ?? null;
        if (is_string($applyingFor)) {
            $decoded = json_decode($applyingFor, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $applyingFor = $decoded;
            }
        }

        return [
            'id' => $this->userValue($user, 'user_id'),
            'user_id' => $this->userValue($user, 'user_id'),
            'email' => $this->userValue($user, 'domain_email') ?? $this->userValue($user, 'email'),
            'domain_email' => $this->userValue($user, 'domain_email') ?? $this->userValue($user, 'email'),
            'name_last' => $this->userValue($user, 'name_last'),
            'name_first' => $this->userValue($user, 'name_first'),
            'name_middle' => $this->userValue($user, 'name_middle'),
            'role' => $this->userValue($user, 'role'),
            'department_id' => $this->userValue($user, 'department_id'),
            'current_rank' => $this->userValue($user, 'current_rank'),
            'current_salary' => $this->userValue($user, 'current_salary'),
            'nature_of_appointment' => $this->userValue($user, 'nature_of_appointment'),
            'educational_attainment' => $this->userValue($user, 'educational_attainment'),
            'eligibility_exams' => $this->userValue($user, 'eligibility_exams'),
            'teaching_experience_years' => $this->userValue($user, 'teaching_experience_years'),
            'industry_experience_years' => $this->userValue($user, 'industry_experience_years'),
            'applying_for' => $applyingFor,
            'doctorate' => $this->userValue($user, 'doctorate'),
            'educational_attainment_json' => $this->userValue($user, 'educational_attainment_json'),
            'eligibility_exams_json' => $this->userValue($user, 'eligibility_exams_json'),
            'applying_for_json' => $this->userValue($user, 'applying_for_json'),
            'date_of_last_promotion' => $this->userValue($user, 'date_of_last_promotion'),
            'last_promotion_date' => $this->userValue($user, 'last_promotion_date'),
            'status' => $this->userValue($user, 'status'),
            'is_first_login' => (bool) ($this->userValue($user, 'is_first_login') ?? false),
        ];
    }
}
