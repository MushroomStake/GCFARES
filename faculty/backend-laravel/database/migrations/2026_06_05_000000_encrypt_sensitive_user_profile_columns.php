<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE users MODIFY current_salary LONGTEXT NULL');
        DB::statement('ALTER TABLE users MODIFY date_of_last_promotion LONGTEXT NULL');
        DB::statement('ALTER TABLE users MODIFY last_promotion_date LONGTEXT NULL');

        DB::table('users')->orderBy('user_id')->chunkById(100, function ($users) {
            foreach ($users as $user) {
                $update = [];

                foreach (['current_salary', 'date_of_last_promotion', 'last_promotion_date'] as $field) {
                    $value = $user->{$field} ?? null;
                    if ($value === null || $value === '') {
                        continue;
                    }

                    try {
                        Crypt::decryptString((string) $value);
                        continue;
                    } catch (\Throwable) {
                        $update[$field] = Crypt::encryptString((string) $value);
                    }
                }

                if ($update !== []) {
                    DB::table('users')->where('user_id', $user->user_id)->update($update);
                }
            }
        }, 'user_id');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users MODIFY current_salary DECIMAL(15,2) NULL');
        DB::statement('ALTER TABLE users MODIFY date_of_last_promotion DATE NULL');
        DB::statement('ALTER TABLE users MODIFY last_promotion_date DATE NULL');
    }
};