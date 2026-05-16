<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id('user_id'); // Primary Key (Matches your user_id fields)
            $table->string('name_last');
            $table->string('name_first');
            $table->string('name_middle')->nullable();
            $table->string('domain_email')->unique();
            $table->string('password'); // Laravel convention replaces password_hash
            $table->string('role');
            $table->unsignedInteger('department_id')->nullable();
            $table->string('current_rank')->nullable();
            $table->decimal('current_salary', 10, 2)->nullable();
            $table->string('nature_of_appointment')->nullable();
            $table->string('educational_attainment')->nullable();
            $table->text('eligibility_exams')->nullable();
            $table->integer('teaching_experience_years')->default(0)->nullable();
            $table->integer('industry_experience_years')->default(0)->nullable();
            $table->text('applying_for')->nullable();
            $table->date('date_of_last_promotion')->nullable();
            $table->string('status')->default('inactive');
            $table->boolean('is_first_login')->default(true);
            
            // Handles structured JSON blocks safely inside modern MySQL
            $table->json('doctorate')->nullable();
            $table->json('educational_attainment_json')->nullable();
            $table->json('eligibility_exams_json')->nullable();
            $table->json('applying_for_json')->nullable();
            
            $table->timestamps(); // Generates created_at and updated_at automatically
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};