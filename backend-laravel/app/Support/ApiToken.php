<?php

namespace App\Support;

use App\Models\User;

class ApiToken
{
    public static function issue(User $user): string
    {
        $payload = [
            'sub' => $user->getKey(),
            'email' => $user->domain_email,
            'iat' => time(),
        ];

        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $encodedPayload = self::base64UrlEncode($payloadJson ?: '{}');

        return $encodedPayload.'.'.self::sign($encodedPayload);
    }

    public static function parse(string $token): ?array
    {
        [$encodedPayload, $signature] = array_pad(explode('.', $token, 2), 2, null);

        if (!$encodedPayload || !$signature) {
            return null;
        }

        if (!hash_equals(self::sign($encodedPayload), (string) $signature)) {
            return null;
        }

        $decoded = json_decode(self::base64UrlDecode($encodedPayload), true);

        return is_array($decoded) ? $decoded : null;
    }

    public static function resolveUser(string $token): ?User
    {
        $payload = self::parse($token);

        if (!$payload || empty($payload['sub'])) {
            return null;
        }

        return User::query()->whereKey($payload['sub'])->first();
    }

    private static function sign(string $value): string
    {
        return hash_hmac('sha256', $value, self::secret());
    }

    private static function secret(): string
    {
        return (string) (env('API_ENCRYPTION_KEY') ?: config('app.key'));
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? '' : $decoded;
    }
}