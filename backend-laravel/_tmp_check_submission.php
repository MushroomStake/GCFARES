<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = Illuminate\Support\Facades\DB::table('area_submissions')
    ->where('application_id', 7)
    ->where('user_id', 16)
    ->where('cycle_id', 3)
    ->where('part_id', 'I-C')
    ->orderByDesc('submission_id')
    ->limit(5)
    ->get();

echo json_encode($rows, JSON_PRETTY_PRINT), PHP_EOL;
