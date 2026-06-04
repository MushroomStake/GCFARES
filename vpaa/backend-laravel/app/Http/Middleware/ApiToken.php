<?php

namespace App\Http\Middleware;

use App\Support\ApiToken as ApiTokenService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken() ?: $request->header('X-Api-Token');

        if (!$token) {
            return response()->json(['error' => 'Missing API token.'], 401);
        }

        $user = ApiTokenService::resolveUser($token);

        if (!$user) {
            return response()->json(['error' => 'Invalid or expired API token.'], 401);
        }

        $request->setUserResolver(static fn () => $user);
        $request->attributes->set('api_user', $user);

        return $next($request);
    }
}