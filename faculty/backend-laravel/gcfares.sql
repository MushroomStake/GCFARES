-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3307
-- Generation Time: Jun 04, 2026 at 04:04 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gcfares`
--

-- --------------------------------------------------------

--
-- Table structure for table `applications`
--

CREATE TABLE `applications` (
  `application_id` bigint(20) NOT NULL,
  `application_number` varchar(255) NOT NULL,
  `faculty_id` int(11) NOT NULL,
  `current_rank_at_time` varchar(255) NOT NULL,
  `target_position_id` bigint(20) NOT NULL,
  `cycle_id` bigint(20) NOT NULL,
  `status` varchar(50) DEFAULT 'Draft' CHECK (`status` in ('Draft','Pending','HR_Completed','VPAA_Completed')),
  `hr_score` decimal(10,2) DEFAULT 0.00,
  `final_score` decimal(10,2) DEFAULT 0.00,
  `vpaa_comment` text DEFAULT NULL,
  `hr_completed_at` timestamp NULL DEFAULT NULL,
  `vpaa_completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `qual_experience` text DEFAULT NULL,
  `qual_degree` text DEFAULT NULL,
  `qual_teaching` text DEFAULT NULL,
  `qual_research` text DEFAULT NULL,
  `qual_eligibility` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `application_logs`
--

CREATE TABLE `application_logs` (
  `log_id` bigint(20) NOT NULL,
  `application_id` bigint(20) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `old_status` varchar(255) DEFAULT NULL,
  `new_status` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `archived_faculty_users`
--

CREATE TABLE `archived_faculty_users` (
  `archive_id` bigint(20) NOT NULL,
  `source_user_id` int(11) NOT NULL,
  `name_last` varchar(255) NOT NULL,
  `name_first` varchar(255) NOT NULL,
  `name_middle` varchar(255) DEFAULT NULL,
  `domain_email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL CHECK (`role` in ('HR','VPAA','Faculty')),
  `department_id` bigint(20) DEFAULT NULL,
  `current_rank` varchar(255) DEFAULT NULL,
  `current_salary` decimal(15,2) DEFAULT NULL,
  `nature_of_appointment` varchar(255) DEFAULT NULL,
  `educational_attainment` varchar(255) DEFAULT NULL,
  `eligibility_exams` text DEFAULT NULL,
  `teaching_experience_years` int(11) DEFAULT 0,
  `industry_experience_years` int(11) DEFAULT 0,
  `applying_for` text DEFAULT NULL,
  `date_of_last_promotion` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'inactive',
  `is_first_login` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `doctorate` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`doctorate`)),
  `educational_attainment_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`educational_attainment_json`)),
  `eligibility_exams_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`eligibility_exams_json`)),
  `last_promotion_date` date DEFAULT NULL,
  `applying_for_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applying_for_json`)),
  `archived_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `archived_by` varchar(36) DEFAULT NULL,
  `archived_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `areas`
--

CREATE TABLE `areas` (
  `area_id` bigint(20) NOT NULL,
  `area_name` text NOT NULL,
  `description` text DEFAULT NULL,
  `max_possible_points` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`area_id`, `area_name`, `description`, `max_possible_points`) VALUES
(4, 'AREA I: Educational Qualifications', 'Educational background and degrees', 85.00),
(5, 'AREA II: Research and Publications', 'Research work and published papers', 20.00),
(6, 'AREA III: Teaching Experience and Professional Services', 'Teaching experience and service contributions', 20.00),
(7, 'AREA IV: Performance Evaluation', 'Performance ratings and evaluations', 10.00),
(8, 'AREA V: Training and Seminars', 'Trainings, workshops, and seminars attended', 20.00),
(9, 'AREA VI: Expert Services Rendered', NULL, 20.00),
(10, 'AREA VII: INVOLVEMENT IN PROFESSIONAL ORGANIZATIONS', NULL, 10.00),
(11, 'AREA VIII: AWARDS OF DISTINCTION RECEIVED IN RECOGNITION OF ACHIEVEMENTS IN RELEVANT AREAS OF SPECIALIZATION/ PROFESSION AND/OR ASSIGNMENT OF FACULTY CONCERNED', NULL, 10.00),
(12, 'AREA IX: COMMUNITY OUTREACH', NULL, 5.00),
(13, 'AREA X: PROFESSIONAL EXAMINATION (PRC,CSC AND TESDA)', NULL, 10.00);

-- --------------------------------------------------------

--
-- Table structure for table `area_iv_student_evaluation_imports`
--

CREATE TABLE `area_iv_student_evaluation_imports` (
  `import_id` bigint(20) NOT NULL,
  `cycle_id` bigint(20) NOT NULL,
  `employee_name` text NOT NULL,
  `normalized_name` text NOT NULL,
  `total_average_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `matched_application_id` bigint(20) DEFAULT NULL,
  `matched_faculty_id` int(11) DEFAULT NULL,
  `source_file_name` text DEFAULT NULL,
  `source_row_number` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `area_part_templates`
--

CREATE TABLE `area_part_templates` (
  `template_id` bigint(20) NOT NULL,
  `area_id` bigint(20) NOT NULL,
  `part_id` varchar(255) NOT NULL CHECK (octet_length(trim(`part_id`)) > 0),
  `part_label` text DEFAULT NULL,
  `part_title` text DEFAULT NULL,
  `storage_bucket` varchar(255) NOT NULL DEFAULT 'documents',
  `storage_path` varchar(512) NOT NULL,
  `file_name` text DEFAULT NULL,
  `mime_type` text DEFAULT NULL,
  `file_size_bytes` bigint(20) DEFAULT NULL,
  `template_kind` varchar(50) NOT NULL DEFAULT 'xlsx' CHECK (`template_kind` in ('xlsx','csv','pdf','docx','other')),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `uploaded_by` bigint(20) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `area_submissions`
--

CREATE TABLE `area_submissions` (
  `submission_id` bigint(20) NOT NULL,
  `application_id` bigint(20) NOT NULL,
  `area_id` bigint(20) NOT NULL,
  `file_path` varchar(512) DEFAULT NULL,
  `csv_total_average_rate` decimal(10,2) DEFAULT NULL,
  `hr_points` decimal(10,2) DEFAULT 0.00,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_id` int(11) DEFAULT NULL,
  `cycle_id` bigint(20) DEFAULT NULL,
  `part_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `area_submission_criterion_scores`
--

CREATE TABLE `area_submission_criterion_scores` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `submission_id` bigint(20) UNSIGNED NOT NULL,
  `application_id` bigint(20) UNSIGNED DEFAULT NULL,
  `area_id` bigint(20) UNSIGNED DEFAULT NULL,
  `part_id` varchar(255) DEFAULT NULL,
  `criterion_key` varchar(255) NOT NULL,
  `criterion_label` varchar(255) DEFAULT NULL,
  `criterion_title` text DEFAULT NULL,
  `criterion_max_points` decimal(10,2) NOT NULL DEFAULT 0.00,
  `score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `capped_score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `excess_score` decimal(10,2) NOT NULL DEFAULT 0.00,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cycle_participants`
--

CREATE TABLE `cycle_participants` (
  `participant_id` bigint(20) NOT NULL,
  `cycle_id` bigint(20) NOT NULL,
  `faculty_id` int(11) DEFAULT NULL,
  `invite_email` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'invited' CHECK (`status` in ('invited','accepted','declined','removed')),
  `invited_by` int(11) DEFAULT NULL,
  `invited_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `department_id` bigint(20) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `department_code` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`department_id`, `department_name`, `department_code`) VALUES
(1, 'College of Computer Studies', 'CCS'),
(6, 'College of Hospitality and Tourism Management', 'CHTM'),
(7, 'College of Business Administration', 'CBA'),
(8, 'College of Allied Health Sciences', 'CAHS'),
(9, 'College of Education, Arts, and Sciences', 'CEAS');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `positions`
--

CREATE TABLE `positions` (
  `position_id` bigint(20) NOT NULL,
  `position_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `required_area_count` int(11) DEFAULT 10,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ranking_cycles`
--

CREATE TABLE `ranking_cycles` (
  `cycle_id` bigint(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `semester` varchar(100) DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `deadline` timestamp NULL DEFAULT NULL,
  `status` varchar(50) DEFAULT 'open' CHECK (`status` in ('open','submissions_closed','finished','closed')),
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `profile_edit_start` timestamp NULL DEFAULT NULL,
  `profile_edit_deadline` timestamp NULL DEFAULT NULL,
  `profile_edit_open` tinyint(1) DEFAULT 0,
  `year` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name_last` varchar(255) NOT NULL,
  `name_first` varchar(255) NOT NULL,
  `name_middle` varchar(255) DEFAULT NULL,
  `domain_email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL CHECK (`role` in ('HR','VPAA','Faculty')),
  `department_id` bigint(20) DEFAULT NULL,
  `current_rank` varchar(255) DEFAULT NULL,
  `current_salary` decimal(15,2) DEFAULT NULL,
  `nature_of_appointment` varchar(255) DEFAULT NULL,
  `educational_attainment` varchar(255) DEFAULT NULL,
  `eligibility_exams` text DEFAULT NULL,
  `teaching_experience_years` int(11) DEFAULT 0,
  `industry_experience_years` int(11) DEFAULT 0,
  `applying_for` text DEFAULT NULL,
  `date_of_last_promotion` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'inactive' CHECK (`status` in ('ranking','inactive')),
  `is_first_login` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `doctorate` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`doctorate`)),
  `educational_attainment_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`educational_attainment_json`)),
  `eligibility_exams_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`eligibility_exams_json`)),
  `last_promotion_date` date DEFAULT NULL,
  `applying_for_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applying_for_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name_last`, `name_first`, `name_middle`, `domain_email`, `password_hash`, `role`, `department_id`, `current_rank`, `current_salary`, `nature_of_appointment`, `educational_attainment`, `eligibility_exams`, `teaching_experience_years`, `industry_experience_years`, `applying_for`, `date_of_last_promotion`, `status`, `is_first_login`, `created_at`, `doctorate`, `educational_attainment_json`, `eligibility_exams_json`, `last_promotion_date`, `applying_for_json`) VALUES
(2, 'Admin', 'System', NULL, 'admin@gordoncollege.edu.ph', '$2y$12$5hzCy4.y3n8u5yAu2qkMguoD.Fw07MYnaCxvjN3RMhA5jQwGoh.Fu', 'HR', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 'inactive', 0, '2026-04-09 00:11:18', NULL, NULL, NULL, NULL, '[]'),
(3, 'VPAA', 'System', NULL, 'vpaa@gordoncollege.edu.ph', '$2y$12$5uf4XmJM4uR5R6YTaW6rxewK3Fbw.RKNLb6ipDjyfd11JT18Jx7dS', 'VPAA', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 'inactive', 0, '2026-04-11 01:06:25', NULL, NULL, NULL, NULL, '[]'),
(16, 'Sancon', 'John Carlos', 'C', 'faculty@gordoncollege.edu.ph', '$2y$12$NSJl/wuWBwI8ymOT4iu/oeEo/jxZYY3WEAEOY4s5MRRLJRzAdCjzu', 'Faculty', 6, 'Assistant Professor I', NULL, 'Part-Time', 'Bachelor of Science in Computer Sciences', 'Civil Service Professionals — Passed May 2027', 10, 10, 'Professor II, Professor I, Professor III', '2026-05-16', 'ranking', 0, '2026-05-02 01:59:09', '[{\"degree\":\"Doctor of Philosophy in Science\",\"institution\":\"Gordon College \\u00b7 2015\"}]', '[{\"level\":\"Bachelor\'s\",\"degree\":\"Bachelor of Science in Computer Sciences\",\"institution\":\"Gordon College \\u00b7 2015\"}]', '[{\"text\":\"Civil Service Professionals \\u2014 Passed May 2027\"}]', '2026-05-16', '[\"Professor II\",\"Professor I\",\"Professor III\"]'),
(17, 'Sancon', 'John Doe', NULL, 'sancon.doe@gordoncollege.edu.ph', '$2y$12$pyQ4D70wk1KiOhbqJJt86efSlOCqPfGvs7/JTgjDO07YnkpZxC1r6', 'Faculty', 8, 'Instructor II', NULL, 'Permanent', NULL, NULL, NULL, NULL, NULL, NULL, 'ranking', 1, '2026-05-05 06:41:10', '[]', '[]', '[]', NULL, '[]'),
(20, 'Quilitorios', 'Juan Christ', NULL, 'faculty2@gordoncollege.edu.ph', '$2y$12$T8KQ7a00USia4AhQil0CvO07liHU7I59jQkqod/P3FIlwaDFmzG1y', 'Faculty', 7, 'Instructor I', NULL, 'Permanent', 'Bachelor of Education, Arts, and Science', NULL, 0, 0, 'Instructor I, Instructor III, Instructor II', NULL, 'ranking', 0, '2026-05-07 05:21:55', '[]', '[{\"level\":\"Bachelor\'s\",\"degree\":\"Bachelor of Education, Arts, and Science\",\"institution\":\"Gordon College \\u00b7 2014\",\"yearGraduated\":null,\"pending\":false}]', '[]', NULL, '[\"Instructor I\", \"Instructor III\", \"Instructor II\"]'),
(21, 'Reyes', 'Jian Carlo', 'Sancon', 'faculty3@gordoncollege.edu.ph', '$2y$12$BLXp3r2hM/x7egNxpovqlu0NU5Zg134ZZvrwNZo2n8StBAsVhC9J6', 'Faculty', 1, 'Instructor I', NULL, 'Permanent', 'Bachelor of Science in Information Technology', NULL, 3, 2, 'Instructor I, Instructor II', '2026-05-01', 'inactive', 1, '2026-05-07 05:36:17', '[]', '[\"Bachelor of Science in Information Technology\"]', '[]', '2026-05-01', '[\"Instructor I\",\"Instructor II\"]');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`application_id`),
  ADD UNIQUE KEY `application_number` (`application_number`),
  ADD KEY `applications_cycle_id_fkey` (`cycle_id`),
  ADD KEY `applications_target_position_id_fkey` (`target_position_id`),
  ADD KEY `applications_faculty_id_fkey` (`faculty_id`);

--
-- Indexes for table `application_logs`
--
ALTER TABLE `application_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `application_logs_application_id_fkey` (`application_id`),
  ADD KEY `application_logs_changed_by_fkey` (`changed_by`);

--
-- Indexes for table `archived_faculty_users`
--
ALTER TABLE `archived_faculty_users`
  ADD PRIMARY KEY (`archive_id`),
  ADD UNIQUE KEY `source_user_id` (`source_user_id`);

--
-- Indexes for table `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`area_id`);

--
-- Indexes for table `area_iv_student_evaluation_imports`
--
ALTER TABLE `area_iv_student_evaluation_imports`
  ADD PRIMARY KEY (`import_id`),
  ADD KEY `area_iv_student_eval_cycle_fkey` (`cycle_id`),
  ADD KEY `area_iv_student_eval_app_fkey` (`matched_application_id`),
  ADD KEY `area_iv_student_eval_faculty_fkey` (`matched_faculty_id`);

--
-- Indexes for table `area_part_templates`
--
ALTER TABLE `area_part_templates`
  ADD PRIMARY KEY (`template_id`),
  ADD KEY `area_part_templates_area_id_fkey` (`area_id`);

--
-- Indexes for table `area_submissions`
--
ALTER TABLE `area_submissions`
  ADD PRIMARY KEY (`submission_id`),
  ADD KEY `area_submissions_application_id_fkey` (`application_id`),
  ADD KEY `area_submissions_area_id_fkey` (`area_id`),
  ADD KEY `area_submissions_user_id_fkey` (`user_id`),
  ADD KEY `area_submissions_cycle_id_fkey` (`cycle_id`);

--
-- Indexes for table `area_submission_criterion_scores`
--
ALTER TABLE `area_submission_criterion_scores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_submission_criterion_key` (`submission_id`,`criterion_key`),
  ADD KEY `idx_criterion_scores_application` (`application_id`),
  ADD KEY `idx_criterion_scores_area` (`area_id`);

--
-- Indexes for table `cycle_participants`
--
ALTER TABLE `cycle_participants`
  ADD PRIMARY KEY (`participant_id`),
  ADD KEY `cycle_participants_cycle_fk` (`cycle_id`),
  ADD KEY `cycle_participants_faculty_fk` (`faculty_id`),
  ADD KEY `cycle_participants_invited_by_fk` (`invited_by`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `department_code` (`department_code`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `positions`
--
ALTER TABLE `positions`
  ADD PRIMARY KEY (`position_id`);

--
-- Indexes for table `ranking_cycles`
--
ALTER TABLE `ranking_cycles`
  ADD PRIMARY KEY (`cycle_id`),
  ADD KEY `ranking_cycles_created_by_fkey` (`created_by`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `domain_email` (`domain_email`),
  ADD KEY `users_department_id_fkey` (`department_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `applications`
--
ALTER TABLE `applications`
  MODIFY `application_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `application_logs`
--
ALTER TABLE `application_logs`
  MODIFY `log_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `archived_faculty_users`
--
ALTER TABLE `archived_faculty_users`
  MODIFY `archive_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `areas`
--
ALTER TABLE `areas`
  MODIFY `area_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `area_iv_student_evaluation_imports`
--
ALTER TABLE `area_iv_student_evaluation_imports`
  MODIFY `import_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `area_part_templates`
--
ALTER TABLE `area_part_templates`
  MODIFY `template_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `area_submissions`
--
ALTER TABLE `area_submissions`
  MODIFY `submission_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `area_submission_criterion_scores`
--
ALTER TABLE `area_submission_criterion_scores`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cycle_participants`
--
ALTER TABLE `cycle_participants`
  MODIFY `participant_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `department_id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `positions`
--
ALTER TABLE `positions`
  MODIFY `position_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ranking_cycles`
--
ALTER TABLE `ranking_cycles`
  MODIFY `cycle_id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `ranking_cycles` (`cycle_id`),
  ADD CONSTRAINT `applications_faculty_id_fkey` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `applications_target_position_id_fkey` FOREIGN KEY (`target_position_id`) REFERENCES `positions` (`position_id`);

--
-- Constraints for table `application_logs`
--
ALTER TABLE `application_logs`
  ADD CONSTRAINT `application_logs_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`),
  ADD CONSTRAINT `application_logs_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `area_iv_student_evaluation_imports`
--
ALTER TABLE `area_iv_student_evaluation_imports`
  ADD CONSTRAINT `area_iv_student_eval_app_fkey` FOREIGN KEY (`matched_application_id`) REFERENCES `applications` (`application_id`),
  ADD CONSTRAINT `area_iv_student_eval_cycle_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `ranking_cycles` (`cycle_id`),
  ADD CONSTRAINT `area_iv_student_eval_faculty_fkey` FOREIGN KEY (`matched_faculty_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `area_part_templates`
--
ALTER TABLE `area_part_templates`
  ADD CONSTRAINT `area_part_templates_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas` (`area_id`);

--
-- Constraints for table `area_submissions`
--
ALTER TABLE `area_submissions`
  ADD CONSTRAINT `area_submissions_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`),
  ADD CONSTRAINT `area_submissions_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas` (`area_id`),
  ADD CONSTRAINT `area_submissions_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `ranking_cycles` (`cycle_id`),
  ADD CONSTRAINT `area_submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `cycle_participants`
--
ALTER TABLE `cycle_participants`
  ADD CONSTRAINT `cycle_participants_cycle_fk` FOREIGN KEY (`cycle_id`) REFERENCES `ranking_cycles` (`cycle_id`),
  ADD CONSTRAINT `cycle_participants_faculty_fk` FOREIGN KEY (`faculty_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `cycle_participants_invited_by_fk` FOREIGN KEY (`invited_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `ranking_cycles`
--
ALTER TABLE `ranking_cycles`
  ADD CONSTRAINT `ranking_cycles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

