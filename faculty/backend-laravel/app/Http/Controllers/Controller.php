<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Crypt;

abstract class Controller
{
    protected const ENCRYPTED_USER_FIELDS = [
        'current_salary',
        'nature_of_appointment',
        'educational_attainment',
        'eligibility_exams',
        'applying_for',
        'date_of_last_promotion',
        'last_promotion_date',
        'doctorate',
        'educational_attainment_json',
        'eligibility_exams_json',
        'applying_for_json',
    ];

    protected function userValue(object|array|null $user, string $field): mixed
    {
        if ($user === null) {
            return null;
        }

        $value = is_array($user) ? ($user[$field] ?? null) : ($user->{$field} ?? null);

        if (!in_array($field, self::ENCRYPTED_USER_FIELDS, true) || !is_string($value)) {
            return $value;
        }

        return $this->decryptValue($value);
    }

    protected function decryptUserRow(object|array|null $user): array
    {
        if ($user === null) {
            return [];
        }

        $row = is_array($user) ? $user : get_object_vars($user);

        foreach (self::ENCRYPTED_USER_FIELDS as $field) {
            if (!array_key_exists($field, $row)) {
                continue;
            }

            $row[$field] = $this->decryptValue($row[$field]);
        }

        return $row;
    }

    protected function encryptUserPayload(array $payload): array
    {
        foreach ($payload as $field => $value) {
            if ($value === null || !in_array($field, self::ENCRYPTED_USER_FIELDS, true)) {
                continue;
            }

            $payload[$field] = $this->encryptValue($value);
        }

        return $payload;
    }

    protected function encryptValue(mixed $value): string
    {
        if (is_array($value)) {
            $value = json_encode($value, JSON_UNESCAPED_UNICODE);
        } elseif (!is_string($value)) {
            $value = (string) $value;
        }

        return Crypt::encryptString($value);
    }

    protected function decryptValue(mixed $value): mixed
    {
        if (!is_string($value) || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }
}
