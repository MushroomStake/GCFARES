import http from 'node:http';
import { supabase } from './functions/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.BACKEND_PORT || 3001;

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload || {});
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-upload-key',
  });
  res.end(body);
}

async function handleUpload(req, res) {
  console.log(`[${new Date().toISOString()}] ◆ UPLOAD REQUEST: method=${req.method} url=${req.url}`);
  
  if (req.method === 'OPTIONS') {
    console.log('[uploads] responding to OPTIONS');
    return jsonResponse(res, 204, {});
  }

  if (req.method !== 'POST') {
    console.log('[uploads] rejecting non-POST method:', req.method);
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

  let raw = '';
  for await (const chunk of req) raw += chunk;

  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch (e) {
    return jsonResponse(res, 400, { error: 'Invalid JSON' });
  }

  console.log('[uploads] parsed payload keys:', Object.keys(payload));
  console.log('[uploads] payload sample:', JSON.stringify(payload).slice(0, 1000));

  // `file_path` is required; application_id may be inferred if missing
  const required = ['file_path'];
  for (const k of required) {
    if (!payload[k]) {
      return jsonResponse(res, 400, { error: `Missing required field: ${k}` });
    }
  }
  // Optional shared key validation to protect the endpoint in dev environments
  const requiredKey = process.env.BACKEND_UPLOAD_KEY;
  if (requiredKey) {
    const provided = req.headers['x-upload-key'] || req.headers['authorization'] || '';
    if (String(provided).trim() !== String(requiredKey).trim()) {
      return jsonResponse(res, 403, { error: 'Invalid upload key' });
    }
  }

  // If application_id is missing, try to infer a reasonable candidate from the submitting faculty user_id
  let applicationId = payload.application_id || null;
  if (!applicationId) {
    const appCandidates = (process.env.SUPABASE_APPLICATION_TABLE_CANDIDATES || 'applications,ranking_applications,faculty_applications')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const facultyId = payload.user_id || null;
    if (facultyId !== null && facultyId !== undefined && facultyId !== '') {
      for (const t of appCandidates) {
        try {
          const probe = await supabase
            .from(t)
            .select('*')
            .eq('faculty_id', facultyId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!probe.error && probe.data) {
            applicationId = probe.data.id || probe.data.application_id || null;
            if (applicationId) break;
          }
        } catch (e) {
          // ignore and continue
        }
      }

      if (!applicationId) {
        for (const t of appCandidates) {
          try {
            const probe = await supabase.from(t).select('*').limit(1).maybeSingle();
            if (!probe.error && probe.data) {
              applicationId = probe.data.id || probe.data.application_id || null;
              if (applicationId) break;
            }
          } catch (e) {
            // ignore and continue
          }
        }
      }
    }
  }

  // Track what area_id was received vs what will be used
  const receivedAreaId = payload.area_id;
  console.log(`[uploads] area_id from request body: ${receivedAreaId}`);

  // Use the client-provided area_id if present; only infer if missing
  let areaId = payload.area_id || null;
  
  if (!areaId) {
    // Only infer a default area_id if the client did not provide one
    console.log('[uploads] area_id missing from request, inferring default...');
    const areaCandidates = (process.env.SUPABASE_AREA_TABLE_CANDIDATES || 'areas,ranking_areas,area_definitions')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const t of areaCandidates) {
      try {
        const probe = await supabase.from(t).select('*').limit(1).maybeSingle();
        if (!probe.error && probe.data) {
          areaId = probe.data.id || probe.data.area_id || probe.data.code || probe.data.area_code || null;
          if (areaId) {
            console.log(`[uploads] inferred area_id=${areaId} from first row of ${t}`);
            break;
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // Resolve cycle_id from request first; if missing, infer currently open cycle.
  let cycleId = payload.cycle_id || null;
  if (!cycleId) {
    const cycleCandidates = (process.env.SUPABASE_CYCLE_TABLE_CANDIDATES || 'ranking_cycles,cycles')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const statusColumns = ['status', 'state', 'cycle_status'];

    outerCycleLookup: for (const t of cycleCandidates) {
      for (const statusColumn of statusColumns) {
        try {
          const openCycle = await supabase
            .from(t)
            .select('*')
            .eq(statusColumn, 'open')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!openCycle.error && openCycle.data) {
            cycleId = openCycle.data.cycle_id || openCycle.data.id || null;
            if (cycleId) break outerCycleLookup;
          }
        } catch (e) {
          // ignore and continue
        }
      }
    }
  }

  const insertPayload = {
    application_id: applicationId,
    area_id: areaId,
    cycle_id: cycleId,
    file_path: payload.file_path,
    uploaded_at: payload.uploaded_at || new Date().toISOString(),
    user_id: payload.user_id || null,
    part_id: payload.part_id || null,
    // IMPORTANT: Do NOT include scoring fields (hr_points, vpaa_points, csv_total_average_rate)
    // These are managed by HR/Admin only and should use database defaults on insert
  };

  console.log(`[uploads] using area_id=${areaId} (received: ${receivedAreaId || 'none'})`);
  console.log(`[uploads] received cycle_id from request: ${payload.cycle_id}, will use: ${insertPayload.cycle_id}`);

  // Validate required non-null fields early so the DB insert doesn't fail with a generic error.
  if (!insertPayload.application_id) {
    console.log('[uploads] missing application_id, aborting upload');
    return jsonResponse(res, 400, { error: 'Missing application_id: ensure an application exists for this faculty before uploading.', payload });
  }
  if (!insertPayload.area_id) {
    console.log('[uploads] missing area_id, aborting upload');
    return jsonResponse(res, 400, { error: 'Missing area_id: cannot determine area for this submission.', payload });
  }

  // Include optional `part_id` if provided by client
  // Do not include unknown columns like `part_id` unless DB schema supports them.

  try {
    // Try calling DB upsert function first (if available). This handles per-part idempotency.
    // IMPORTANT: Only pass document-related fields, not scoring fields
    try {
      // Attempt to read existing row by the unique key so we can preserve scoring fields
      let existingBeforeRpc = null;
      let existingCriterionRows = null;
      try {
        if (insertPayload.application_id && insertPayload.area_id && insertPayload.cycle_id && insertPayload.part_id && insertPayload.user_id) {
          const probe = await supabase
            .from('area_submissions')
            .select('*')
            .match({
              application_id: insertPayload.application_id,
              area_id: insertPayload.area_id,
              cycle_id: insertPayload.cycle_id,
              part_id: insertPayload.part_id,
              user_id: insertPayload.user_id,
            })
            .maybeSingle();
          if (!probe.error && probe.data) {
            existingBeforeRpc = probe.data;
            try {
              const rows = await supabase
                .from('area_submission_criterion_scores')
                .select('*')
                .eq('submission_id', existingBeforeRpc.submission_id || existingBeforeRpc.id);
              if (!rows.error && Array.isArray(rows.data)) existingCriterionRows = rows.data;
            } catch (e) {
              // ignore — best-effort only
            }
          }
        }
      } catch (peekErr) {
        // ignore — best-effort only
      }

      // Before calling the RPC, try to find an existing submission to update in-place.
      // This avoids calling a DB function that may delete+reinsert the submission row
      // and cause `area_submission_criterion_scores` to be cascaded away.
      try {
        let preExisting = null;

        // 1) exact file_path match
        try {
          const byPath = await supabase
            .from('area_submissions')
            .select('*')
            .eq('file_path', insertPayload.file_path)
            .maybeSingle();
          if (!byPath.error && byPath.data) preExisting = byPath.data;
        } catch (e) {
          // ignore
        }

        // 2) application + area + cycle (+ part)
        if (!preExisting && insertPayload.application_id && insertPayload.area_id) {
          try {
            let q = supabase
              .from('area_submissions')
              .select('*')
              .eq('application_id', insertPayload.application_id)
              .eq('area_id', insertPayload.area_id);
            if (insertPayload.cycle_id) q = q.eq('cycle_id', insertPayload.cycle_id);
            if (insertPayload.part_id) q = q.eq('part_id', insertPayload.part_id);
            else q = q.is('part_id', null);
            const byCycle = await q.maybeSingle();
            if (!byCycle.error && byCycle.data) preExisting = byCycle.data;
          } catch (e) {
            // ignore
          }
        }

        // 3) fallback: application + area + user
        if (!preExisting && insertPayload.application_id && insertPayload.area_id && insertPayload.user_id) {
          try {
            let q = supabase
              .from('area_submissions')
              .select('*')
              .eq('application_id', insertPayload.application_id)
              .eq('area_id', insertPayload.area_id)
              .eq('user_id', insertPayload.user_id);
            if (insertPayload.cycle_id) q = q.eq('cycle_id', insertPayload.cycle_id);
            if (insertPayload.part_id) q = q.eq('part_id', insertPayload.part_id);
            const byTrip = await q.maybeSingle();
            if (!byTrip.error && byTrip.data) preExisting = byTrip.data;
          } catch (e) {
            // ignore
          }
        }

        if (preExisting) {
          console.log('[uploads] pre-existing submission found — updating in-place to preserve scores, id=', preExisting.submission_id || preExisting.id);
          const updatePayload = {
            file_path: insertPayload.file_path,
            uploaded_at: insertPayload.uploaded_at,
            user_id: insertPayload.user_id || null,
            part_id: insertPayload.part_id || null,
          };
          try {
            const upd = await supabase
              .from('area_submissions')
              .update(updatePayload)
              .eq('submission_id', preExisting.submission_id || preExisting.id)
              .select('*')
              .maybeSingle();
            if (!upd.error && upd.data) {
              console.log('[uploads] updated row (preserved scores):', JSON.stringify(upd.data).slice(0, 200));
              return jsonResponse(res, 200, { data: upd.data });
            }
          } catch (e) {
            // ignore and fall through to RPC
            console.log('[uploads] failed to update pre-existing row, falling back to RPC:', e?.message || e);
          }
        }
      } catch (preCheckErr) {
        console.log('[uploads] pre-RPC existing check failed, proceeding to RPC:', preCheckErr?.message || preCheckErr);
      }

      const rpcParams = {
        p_application_id: insertPayload.application_id,
        p_area_id: insertPayload.area_id,
        p_user_id: insertPayload.user_id,
        p_cycle_id: insertPayload.cycle_id,
        p_part_id: insertPayload.part_id,
        p_file_path: insertPayload.file_path,
        p_uploaded_at: insertPayload.uploaded_at,
        // IMPORTANT: Do NOT pass csv_total_average_rate, hr_points, vpaa_points
        // These are set by admin/HR and should never be reset by faculty uploads
      };

      console.log('[uploads] calling RPC upsert_area_submission with params:', JSON.stringify(rpcParams));
      const rpcRes = await supabase.rpc('upsert_area_submission', rpcParams);
      if (!rpcRes.error && rpcRes.data) {
        // RPC returns a result row (as array for table-returning functions)
        const returned = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
        console.log('[uploads] upsert_area_submission result:', returned);

        // If the RPC returned and overwrote scoring fields or replaced the submission row,
        // restore preserved values and criterion rows if needed.
        try {
          if (existingBeforeRpc && returned) {
            const preserve = {};
            let needRestore = false;
            if (existingBeforeRpc.hr_points !== null && existingBeforeRpc.hr_points !== undefined) {
              if (returned.hr_points !== existingBeforeRpc.hr_points) {
                preserve.hr_points = existingBeforeRpc.hr_points;
                needRestore = true;
              }
            }
            if (existingBeforeRpc.csv_total_average_rate !== null && existingBeforeRpc.csv_total_average_rate !== undefined) {
              if (returned.csv_total_average_rate !== existingBeforeRpc.csv_total_average_rate) {
                preserve.csv_total_average_rate = existingBeforeRpc.csv_total_average_rate;
                needRestore = true;
              }
            }

            if (needRestore && Object.keys(preserve).length) {
              console.log('[uploads] RPC appears to have modified scoring fields; restoring preserved values for submission_id=', returned.submission_id || returned.id || '<unknown>');
              const restoreRes = await supabase
                .from('area_submissions')
                .update(preserve)
                .eq('submission_id', returned.submission_id || returned.id)
                .select('*')
                .maybeSingle();
              if (!restoreRes.error && restoreRes.data) {
                console.log('[uploads] restored scoring fields:', JSON.stringify(restoreRes.data).slice(0, 200));
                // continue to attempt criterion restore below
              }
            }

            // If the RPC replaced the submission row (new submission_id), re-insert criterion rows
            try {
              const oldId = existingBeforeRpc.submission_id || existingBeforeRpc.id;
              const newId = returned.submission_id || returned.id;
              if (oldId && newId && String(oldId) !== String(newId) && Array.isArray(existingCriterionRows) && existingCriterionRows.length) {
                console.log('[uploads] RPC replaced submission row — attempting to re-insert', existingCriterionRows.length, 'criterion rows to new submission_id=', newId);
                const toInsert = existingCriterionRows.map((r) => ({
                  submission_id: newId,
                  application_id: returned.application_id || insertPayload.application_id,
                  area_id: returned.area_id || insertPayload.area_id,
                  part_id: returned.part_id || insertPayload.part_id || r.part_id,
                  criterion_key: r.criterion_key,
                  criterion_label: r.criterion_label,
                  criterion_title: r.criterion_title,
                  criterion_max_points: r.criterion_max_points,
                  score: r.score,
                  capped_score: r.capped_score,
                  excess_score: r.excess_score,
                  notes: r.notes,
                  reviewed_by: r.reviewed_by,
                  reviewed_at: r.reviewed_at,
                }));

                // Use upsert to avoid duplicates if rows already exist for newId
                const reinsert = await supabase
                  .from('area_submission_criterion_scores')
                  .upsert(toInsert, { onConflict: 'submission_id,criterion_key' })
                  .select();
                if (reinsert.error) {
                  console.log('[uploads] failed to re-insert criterion rows after RPC:', reinsert.error.message || reinsert.error);
                } else {
                  console.log('[uploads] successfully re-inserted criterion rows for new submission_id=', newId);
                }
              }
            } catch (reInsErr) {
              console.log('[uploads] error while attempting to restore criterion rows:', reInsErr?.message || reInsErr);
            }
          }
        } catch (restoreErr) {
          console.log('[uploads] failed to restore scoring fields after RPC:', restoreErr?.message || restoreErr);
        }

        return jsonResponse(res, 200, { data: returned });
      } else if (rpcRes.error) {
        console.log('[uploads] upsert_area_submission RPC error (falling back):', rpcRes.error.message || rpcRes.error);
      }
    } catch (rpcErr) {
      console.log('[uploads] upsert_area_submission threw, falling back to legacy logic:', rpcErr?.message || rpcErr);
    }

    // Idempotency: try to find existing submission to update instead of inserting duplicates.
    // Strategy (priority order):
    // 1) exact file_path match
    // 2) application_id + area_id + cycle_id (+ part_id if provided)  <-- prefer this so admin/CSV-created rows are matched
    // 3) application_id + area_id + user_id (+ part_id) as a fallback
    let existing = null;

    // 1) Try exact file_path match
    try {
      const byPath = await supabase
        .from('area_submissions')
        .select('*')
        .eq('file_path', insertPayload.file_path)
        .maybeSingle();
      if (!byPath.error && byPath.data) existing = byPath.data;
    } catch (e) {
      // ignore
    }

    // 2) Try application_id + area_id + cycle_id (preferred — ignores user_id so CSV/admin rows match)
    if (!existing && applicationId && areaId) {
      try {
        let byCycleQuery = supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', applicationId)
          .eq('area_id', areaId);
        if (cycleId) {
          byCycleQuery = byCycleQuery.eq('cycle_id', cycleId);
        }
        if (payload.part_id) {
          byCycleQuery = byCycleQuery.eq('part_id', payload.part_id);
        } else {
          // prefer rows without part_id if caller did not include one
          byCycleQuery = byCycleQuery.is('part_id', null);
        }
        const byCycle = await byCycleQuery.maybeSingle();
        if (!byCycle.error && byCycle.data) existing = byCycle.data;
      } catch (e) {
        // ignore
      }
    }

    // 3) Fallback: try application_id + area_id + user_id
    if (!existing && applicationId && areaId && payload.user_id) {
      try {
        let byTripQuery = supabase
          .from('area_submissions')
          .select('*')
          .eq('application_id', applicationId)
          .eq('area_id', areaId)
          .eq('user_id', payload.user_id);
        if (cycleId) {
          byTripQuery = byTripQuery.eq('cycle_id', cycleId);
        }
        if (payload.part_id) {
          byTripQuery = byTripQuery.eq('part_id', payload.part_id);
        }
        const byTrip = await byTripQuery.maybeSingle();
        if (!byTrip.error && byTrip.data) existing = byTrip.data;
      } catch (e) {
        // ignore
      }
    }

    // (No part_id-based lookup: table may not include that column)

    if (existing) {
      const idVal = existing.submission_id || existing.id;
      console.log('[uploads] existing submission found, id=', idVal);
      
      // Create update payload that PRESERVES scoring fields (hr_points, vpaa_points)
      // Only update document-related fields when faculty uploads
      const updatePayload = {
        file_path: insertPayload.file_path,
        uploaded_at: insertPayload.uploaded_at,
        user_id: insertPayload.user_id || null,
        part_id: insertPayload.part_id || null,
        // IMPORTANT: Do NOT include hr_points, vpaa_points, or csv_total_average_rate
        // These are set by HR/Admin and should not be overwritten by faculty uploads
      };
      
      try {
        const upd = await supabase
          .from('area_submissions')
          .update(updatePayload)
          .eq('submission_id', idVal)
          .select('*')
          .maybeSingle();
        if (!upd.error && upd.data) {
          console.log('[uploads] updated row (preserved scores):', JSON.stringify(upd.data).slice(0, 200));
          return jsonResponse(res, 200, { data: upd.data });
        }
      } catch (e) {
        // try fallback by id
        try {
          const upd2 = await supabase
            .from('area_submissions')
            .update(updatePayload)
            .eq('id', idVal)
            .select('*')
            .maybeSingle();
          if (!upd2.error && upd2.data) {
            console.log('[uploads] updated row (by id):', JSON.stringify(upd2.data).slice(0, 200));
            return jsonResponse(res, 200, { data: upd2.data });
          }
        } catch (ie) {
          // ignore and fallback to insert
        }
      }
    }

    // No existing row found — insert a new one
    console.log('[uploads] inserting new area_submissions row', insertPayload);
    const result = await supabase.from('area_submissions').insert([insertPayload]).select('*').maybeSingle();
    if (result.error) {
      console.log('[uploads] insert error:', result.error.message || result.error);
      return jsonResponse(res, 500, { error: result.error.message || result.error });
    }

    console.log('[uploads] inserted row:', JSON.stringify(result.data).slice(0, 200));
    return jsonResponse(res, 201, { data: result.data });
  } catch (e) {
    return jsonResponse(res, 500, { error: e.message || String(e) });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname}`);
  
  if (url.pathname === '/api/uploads') {
    return handleUpload(req, res);
  }

  // simple health check
  if (url.pathname === '/health') {
    console.log('[health] ping');
    return jsonResponse(res, 200, { ok: true, timestamp: new Date().toISOString() });
  }

  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Backend running on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Upload: POST http://localhost:${PORT}/api/uploads`);
  console.log(`════════════════════════════════════════\n`);
});
