<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'bucket' => ['required', 'string'],
            'path' => ['required', 'string'],
            'file' => ['required', 'file'],
            'upsert' => ['nullable'],
        ]);

        $bucket = trim(preg_replace('/[^A-Za-z0-9_\-\/]/', '', $validated['bucket']), '/');
        $path = ltrim($validated['path'], '/');
        $fullPath = trim($bucket . '/' . $path, '/');

        if (!$request->boolean('upsert') && Storage::disk('public')->exists($fullPath)) {
            return response()->json(['error' => 'File already exists.'], 409);
        }

        $file = $request->file('file');
        Storage::disk('public')->put($fullPath, file_get_contents($file->getRealPath()));

        return response()->json([
            'data' => [
                'bucket' => $bucket,
                'path' => $path,
                'full_path' => $fullPath,
                'signedUrl' => Storage::disk('public')->url($fullPath),
            ],
        ]);
    }

    public function signedUrl(Request $request)
    {
        $validated = $request->validate([
            'bucket' => ['required', 'string'],
            'path' => ['required', 'string'],
            'expires_in' => ['nullable', 'integer'],
        ]);

        $bucket = trim(preg_replace('/[^A-Za-z0-9_\-\/]/', '', $validated['bucket']), '/');
        $path = ltrim($validated['path'], '/');
        $fullPath = trim($bucket . '/' . $path, '/');

        return response()->json([
            'data' => [
                'signedUrl' => Storage::disk('public')->url($fullPath),
            ],
        ]);
    }
}
