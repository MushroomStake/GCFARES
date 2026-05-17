<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RequireApiToken
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized. Bearer token is required.'], 401);
        }

        $cache = Cache::store('file');
        $userId = $cache->get('api_token_' . $token);

        if (!$userId) {
            return response()->json(['error' => 'Unauthorized. Invalid or expired token.'], 401);
        }

        $user = DB::table('users')->where('user_id', $userId)->first();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized. User not found.'], 401);
        }

        if (!empty($roles)) {
            $allowedRoles = array_map(
                static fn ($role) => strtolower(trim((string) $role)),
                $roles
            );
            $userRole = strtolower(trim((string) ($user->role ?? '')));

            if ($userRole === '' || !in_array($userRole, $allowedRoles, true)) {
                return response()->json(['error' => 'Forbidden. Insufficient role.'], 403);
            }
        }

        $request->attributes->set('auth_user', $user);
        $request->attributes->set('auth_user_id', $user->user_id);

        return $next($request);
    }
}
