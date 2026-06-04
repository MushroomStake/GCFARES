<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FixUserPasswordsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * This seeder will replace plain-text `password_hash` values for the
     * sample users with bcrypt hashes using Laravel's `Hash::make()` so
     * authentication via `Hash::check()` works.
     *
     * Adjust the `$updates` map as needed.
     */
    public function run()
    {
        $updates = [
            // user_id => plain_password
            2 => 'admin123',
            3 => 'admin123',
            16 => 'admin123',
            17 => 'admin123',
            20 => 'admin123',
            21 => 'admin123',
        ];

        foreach ($updates as $userId => $plain) {
            DB::table('users')->where('user_id', $userId)->update([
                'password_hash' => Hash::make($plain),
            ]);
        }
    }
}
