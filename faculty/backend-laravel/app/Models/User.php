<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    public $timestamps = false;

    // 1. Tell Laravel the primary key is user_id, not id
    protected $primaryKey = 'user_id';

    protected $hidden = [
        'password_hash',
    ];

    // 2. Map fillable properties to your actual backup column fields
    protected $fillable = [
        'name_last',
        'name_first',
        'name_middle',
        'domain_email',
        'password_hash',
        'role',
        'department_id',
        'current_rank',
        'current_salary',
        'nature_of_appointment',
        'educational_attainment',
        'eligibility_exams',
        'teaching_experience_years',
        'industry_experience_years',
        'applying_for',
        'date_of_last_promotion',
        'status',
        'is_first_login',
        'doctorate',
        'educational_attainment_json',
        'eligibility_exams_json',
        'last_promotion_date',
        'applying_for_json'
    ];

    // 3. Cast your custom JSON attributes safely
    protected $casts = [
        'current_salary' => 'encrypted',
        'nature_of_appointment' => 'encrypted',
        'educational_attainment' => 'encrypted',
        'eligibility_exams' => 'encrypted',
        'applying_for' => 'encrypted',
        'date_of_last_promotion' => 'encrypted',
        'last_promotion_date' => 'encrypted',
        'doctorate' => 'encrypted:array',
        'educational_attainment_json' => 'encrypted:array',
        'eligibility_exams_json' => 'encrypted:array',
        'applying_for_json' => 'encrypted:array',
        'is_first_login' => 'boolean'
    ];

    // 4. Force Laravel Auth to use password_hash instead of password
    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}