<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('domain_email', $credentials['email'])->first();

        if (!$user || !$this->passwordMatches((string) $credentials['password'], (string) $user->password_hash)) {
            return response()->json(['error' => 'Invalid email or password.'], 422);
        }

        if (strtoupper((string) $user->role) !== 'VPAA') {
            return response()->json(['error' => 'This account is not assigned to the VPAA portal.'], 403);
        }

        $token = ApiToken::issue($user);

        return response()->json([
            'user' => $this->toPublicUser($user),
            'session' => [
                'access_token' => $token,
                'token_type' => 'bearer',
                'user' => $this->toPublicUser($user),
            ],
        ]);
    }

    public function validateToken(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired API token.'], 401);
        }

        $token = $request->bearerToken() ?: '';

        return response()->json([
            'user' => $this->toPublicUser($user),
            'session' => [
                'access_token' => $token,
                'token_type' => 'bearer',
                'user' => $this->toPublicUser($user),
            ],
        ]);
    }

    public function logout(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Signed out successfully.',
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired API token.'], 401);
        }

        $user->password_hash = Hash::make($payload['password']);
        $user->is_first_login = false;
        $user->save();

        return response()->json([
            'user' => $this->toPublicUser($user->fresh()),
        ]);
    }

    private function passwordMatches(string $plainPassword, string $storedPassword): bool
    {
        if ($storedPassword === '') {
            return false;
        }

        if (str_starts_with($storedPassword, '$2y$') || str_starts_with($storedPassword, '$argon2')) {
            return Hash::check($plainPassword, $storedPassword);
        }

        return hash_equals($storedPassword, $plainPassword);
    }

    private function toPublicUser(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'user_id' => $user->getKey(),
            'email' => $user->domain_email,
            'domain_email' => $user->domain_email,
            'role' => $user->role,
            'name_first' => $user->name_first,
            'name_last' => $user->name_last,
            'name_middle' => $user->name_middle,
            'department_id' => $user->department_id,
            'current_rank' => $user->current_rank,
            'nature_of_appointment' => $user->nature_of_appointment,
            'is_first_login' => (bool) $user->is_first_login,
        ];
    }
}