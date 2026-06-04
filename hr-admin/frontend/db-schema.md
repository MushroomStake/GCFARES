departments
├──department_id : int(11)
├──department_name: varchar(100)

areas
├──area_id : int(11)
├──area_name: varchar(100)
├──description: text
├──max_possible_points : decimal (10,2)
├──template_file_path : varchar(255)
├──is_csv_based : tinyint(1)

areasubmissions
├──submission_id : int(11)
├──application : int(11)
├──area_id : int(11)
├──file_path : varchar(255)
├──csv_total_average_rate : decimal(10,2)
├──hr_points : decimal(10,2)
├──vpaa_points : decimal(10,2)
├──uploaded_at : timestamp

applicationlogs
├──log_id : int(11)
├──application_id : int(11)
├──changed_by : int(11)
├──old_status : varchar(50)
├──new_status : varchar(50)
├──comment : text
├──changed_at : timestamp

users
├──user_id : int(11)
├──name_last : varchar(50)
├──name_first : varchar(50)
├──name_middle : varchar(50)
├──domain_email : varchar(100)
├──password_hash : varchar(255)
├──role : enum('HR', 'VPAA', 'Faculty')
├──department_id : int(11)
├──current_rank : varchar(50)
├──current_salary : decimal (12,2)
├──nature_of_appointment : varchar(50)
├──educational_attainment : varchar(100)
├──eligibility_exams : text
├──teaching_experience_years : int(11)
├──industry_experience_years : int(11)
├──applying_for : varchar(100)
├──date_of_last_promotion : date
├──status : enum('active', 'inactive')
├──is_first_login : tinyint(1)
├──created_at : timestamp

positions
├──position_id : int(11)
├──position_name : varchar(100)
├──description : text
├──required_area_count : int(11)
├──is_active : tinyint(1)

applications
├──application_id : int(11)
├──application_number : varchar(50)
├──faculty_id : int(11)
├──current_rank_at_time : varchar(50)
├──target_position_id : int(11)
├──cycle_id : int(11)
├──status : enum ('Draft', 'Submitted', 'Under_HR_Review', 'Under_VPAA_Review', 'For_Publishing', 'Published')
├──hr_score : decimal(10,2)
├──vpaa_score : decimal (10,2)
├──final_score : decimal (10,2)
├──hr_comment : text
├── vpaa_comment : text
├──hr_reviewed_by : int(11)
├──vpaa_reviewed_by : int(11)
├──hr_reviewed_at : datetime
├──vpaa_reviewed_at : datetime
├──created_at : timestamp
├──submitted_at : datetime
├──published_at : datetime

rankingcycles
├──cycle_id : int(11)
├──title : varchar(100)
├──semester : varchar(20)
├──year : year(4)
├──start_date : datetime
├──deadline : datetime
├──status : enum('open', 'closed')
├──created_by : int (11)

area_id from areas is connected to areasubbmissions area_id
department_id from departments is connected to users department_id
user_id from user is connected to applicationlogs changed_by
application_id from applications is connected to areasubmissions and applicationlogs
position_id from positions is connected to applications target_position_id
cycle_id from positions is connected to rankingcycles cycle_id
user_id from users is connected to applications faculty_id, applications hr_reviewed_by, applications vpaa_reviewed_by, rankingcycles created_by