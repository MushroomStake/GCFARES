<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class EncryptPayload
{
    private string $cipher = 'aes-256-gcm';
    private ?string $key;

    public function __construct()
    {
        $this->key = (string) env('API_ENCRYPTION_KEY');
    }

    /**
     * Handle an incoming request and outgoing response.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. INCOMING REQUEST: Intercept and Decrypt incoming JSON from Frontend
        if ($request->isMethod('post') || $request->isMethod('put') || $request->isMethod('patch')) {
            if ($request->has('payload')) {
                try {
                    $wrapper = $request->input('payload');

                    // Extract parts
                    $ciphertext = base64_decode($wrapper['ciphertext'] ?? '');
                    $iv = base64_decode($wrapper['iv'] ?? '');
                    $tag = base64_decode($wrapper['tag'] ?? '');

                    if (empty($ciphertext) || empty($iv) || empty($tag)) {
                        return response()->json(['error' => 'Malformed encryption payload structural components.'], 400);
                    }

                    // Decrypt via native OpenSSL
                    $decryptedText = openssl_decrypt($ciphertext, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag);

                    if ($decryptedText === false) {
                        return response()->json(['error' => 'Decryption failed. Security key mismatch or altered data.'], 400);
                    }

                    // Replace request contents with the cleanly decrypted attributes
                    $decryptedData = json_decode($decryptedText, true);
                    if (is_array($decryptedData)) {
                        $request->merge($decryptedData);
                    }
                    
                    // Strip the encrypted wrapper away so it doesn't interfere with Validation rules
                    $request->request->remove('payload');

                } catch (\Exception $e) {
                    return response()->json(['error' => 'Encryption layer structural parsing failure.'], 400);
                }
            } else {
                // Deny incoming plaintext requests to keep the backend secure
                return response()->json(['error' => 'Bad Request. Plaintext payloads are blocked on this server.'], 400);
            }
        }

        // Send the clean, decrypted data to your normal controllers
        $response = $next($request);

        // 2. OUTGOING RESPONSE: Automatically Intercept and Encrypt Server Data
        if ($response instanceof JsonResponse) {
            $originalData = json_encode($response->getData());

            // Generate a random 12-byte Initialization Vector (Standard for GCM)
            $iv = openssl_random_pseudo_bytes(12);
            $tag = ''; // Populated automatically by reference by OpenSSL

            // Encrypt response string
            $ciphertext = openssl_encrypt($originalData, $this->cipher, $this->key, OPENSSL_RAW_DATA, $iv, $tag);

            // Structure response wrapper
            $encryptedPayload = [
                'ciphertext' => base64_encode($ciphertext),
                'iv' => base64_encode($iv),
                'tag' => base64_encode($tag)
            ];

            // Re-wrap response payload data
            $response->setData(['payload' => $encryptedPayload]);
        }

        return $response;
    }
}
