import { PDFDocument } from 'pdf-lib';

const BACKEND_URL = 'http://localhost:5005/api/v1';

async function runE2ETest() {
  console.log('=== STARTING E2E PRODUCTION READINESS WORKFLOW ===\n');

  const testEmail = `testuser-${Date.now()}@test.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'E2E Tester';
  let accessToken = '';
  let cookieHeader = '';
  let flipbookId = '';
  let flipbookSlug = '';

  // 1. Create a new user
  console.log(`[Step 1] Creating new user: ${testEmail}...`);
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
  });
  if (!regRes.ok) {
    throw new Error(`Registration failed: ${await regRes.text()}`);
  }
  const regData = (await regRes.json()) as any;
  console.log('✓ User registered successfully.\n');

  // 2. Log in
  console.log('[Step 2] Logging in...');
  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }
  const loginData = (await loginRes.json()) as any;
  accessToken = loginData.accessToken;

  // Extract refresh cookie
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No refresh token cookie set by login endpoint!');
  }
  cookieHeader = setCookie.split(';')[0];
  console.log('✓ Login successful. Retrieved token and cookie.\n');

  // 3. Generate a sample PDF and upload it
  console.log('[Step 3] Creating mock PDF using pdf-lib...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([500, 700]);
  const pdfBytes = await pdfDoc.save();

  console.log('[Step 4] Uploading PDF to /flipbooks...');
  const formData = new FormData();
  // Node 20 FormData requires a Blob for file fields
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
  formData.append('pdf', pdfBlob, 'sample-test.pdf');
  formData.append('title', 'E2E Production Test Book');
  formData.append('description', 'A test book generated during E2E verification');

  const uploadRes = await fetch(`${BACKEND_URL}/flipbooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${await uploadRes.text()}`);
  }
  const uploadData = (await uploadRes.json()) as any;
  flipbookId = uploadData.flipbook.id;
  flipbookSlug = uploadData.flipbook.slug;
  console.log(`✓ Upload successful. ID: ${flipbookId}, Slug: ${flipbookSlug}\n`);

  // 4. Wait for processing (polling loop)
  console.log('[Step 5] Polling worker status...');
  let status = 'PENDING';
  let attempts = 0;
  while (status !== 'COMPLETED' && status !== 'FAILED' && attempts < 10) {
    console.log(`Polling attempt ${attempts + 1}...`);
    const statusRes = await fetch(`${BACKEND_URL}/flipbooks/${flipbookId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!statusRes.ok) {
      throw new Error(`Failed to check flipbook status: ${await statusRes.text()}`);
    }
    const statusData = (await statusRes.json()) as any;
    status = statusData.flipbook.status;
    if (status === 'COMPLETED' || status === 'FAILED') break;

    // Wait 2 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  if (status !== 'COMPLETED') {
    throw new Error(`Processing failed or timed out. Status: ${status}`);
  }
  console.log('✓ Flipbook processing completed successfully.\n');

  // Update visibility to PUBLIC so public resolution succeeds
  console.log('[Step 5.5] Toggling visibility settings to PUBLIC...');
  const updateRes = await fetch(`${BACKEND_URL}/flipbooks/${flipbookId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ visibility: 'PUBLIC' }),
  });
  if (!updateRes.ok) {
    throw new Error(`Failed to update flipbook settings: ${await updateRes.text()}`);
  }
  console.log('✓ Flipbook visibility set to PUBLIC.\n');

  // 5. Open the public URL (Verify metadata resolver)
  console.log('[Step 6] Verifying public viewer slug resolution...');
  const publicRes = await fetch(`${BACKEND_URL}/flipbooks/slug/${flipbookSlug}`);
  if (!publicRes.ok) {
    throw new Error(`Failed to fetch public viewer metadata: ${await publicRes.text()}`);
  }
  const publicData = (await publicRes.json()) as any;
  console.log(`✓ Resolved public flipbook title: "${publicData.flipbook.title}"`);
  console.log(`✓ URL: http://localhost:5174/f/${flipbookSlug}\n`);

  // 6. Open the embed URL & Iframe structure
  console.log('[Step 7] Generating embed URL and iframe structure...');
  const embedUrl = `http://localhost:5174/embed/${flipbookSlug}?theme=dark&toolbar=true`;
  const iframeCode = `<iframe src="${embedUrl}" width="800" height="600" allowfullscreen></iframe>`;
  console.log(`✓ Embed URL: ${embedUrl}`);
  console.log(`✓ Iframe Code: ${iframeCode}\n`);

  // 7. Generate the QR code
  console.log('[Step 8] Generating QR code stream...');
  const qrRes = await fetch(`${BACKEND_URL}/flipbooks/${flipbookId}/qr`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!qrRes.ok) {
    throw new Error(`QR Code generation failed: ${await qrRes.text()}`);
  }
  const qrBuffer = await qrRes.arrayBuffer();
  const pngHeader = new Uint8Array(qrBuffer.slice(0, 4));
  // PNG signature is 89 50 4E 47
  if (pngHeader[0] !== 0x89 || pngHeader[1] !== 0x50 || pngHeader[2] !== 0x4e || pngHeader[3] !== 0x47) {
    throw new Error('QR endpoint response does not have a valid PNG file signature!');
  }
  console.log('✓ QR code generated as a valid PNG stream.\n');

  // 8. Track analytics & verify PostgreSQL persistence
  console.log('[Step 9] Sending visitor tracking packet...');
  const visitorId = `visitor-${Date.now()}`;
  const trackRes = await fetch(`${BACKEND_URL}/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `sess-${Date.now()}`,
      flipbookId,
      visitorId,
      duration: 45, // 45 seconds
      pagesRead: [1],
      downloaded: true,
      shared: true,
      sharePlatform: 'email',
      embedded: false,
      referrer: 'e2e-test-runner',
    }),
  });
  if (!trackRes.ok) {
    throw new Error(`Analytics tracking failed: ${await trackRes.text()}`);
  }
  console.log('✓ Tracking packet sent successfully.');

  console.log('[Step 10] Retrieving analytics report to check database persistence...');
  const reportRes = await fetch(`${BACKEND_URL}/analytics/report/${flipbookId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!reportRes.ok) {
    throw new Error(`Failed to retrieve analytics report: ${await reportRes.text()}`);
  }
  const reportData = (await reportRes.json()) as any;
  if (!reportData.report || reportData.report.totalViews === 0 || reportData.report.uniqueVisitors === 0) {
    throw new Error('Database read returned empty analytics! Persistence failed.');
  }
  console.log(`✓ Analytics database persistence verified: ${reportData.report.totalViews} views, ${reportData.report.uniqueVisitors} unique visitors.\n`);

  // 9. Log out
  console.log('[Step 11] Logging out (revoking token)...');
  const logoutRes = await fetch(`${BACKEND_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Cookie': cookieHeader },
  });
  if (!logoutRes.ok) {
    throw new Error(`Logout failed: ${await logoutRes.text()}`);
  }
  console.log('✓ Logout successful.\n');

  // 10. Log back in & verify session persistence
  console.log('[Step 12] Logging back in...');
  const login2Res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  if (!login2Res.ok) {
    throw new Error(`Second login failed: ${await login2Res.text()}`);
  }
  const login2Data = (await login2Res.json()) as any;
  const setCookie2 = login2Res.headers.get('set-cookie');
  if (!setCookie2) {
    throw new Error('No refresh token set during second login!');
  }
  cookieHeader = setCookie2.split(';')[0];
  console.log('✓ Logged back in successfully.');

  console.log('[Step 13] Verifying session persistence (Silent Refresh)...');
  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Cookie': cookieHeader },
  });
  if (!refreshRes.ok) {
    throw new Error(`Silent refresh failed: ${await refreshRes.text()}`);
  }
  const refreshData = (await refreshRes.json()) as any;
  if (!refreshData.accessToken) {
    throw new Error('Refresh token succeeded but returned no access token!');
  }
  console.log('✓ Session persistence verified successfully via silent token refresh.\n');

  console.log('=== ALL E2E READINESS TESTS COMPLETED WITH 100% SUCCESS ===');
}

runE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err.message);
  process.exit(1);
});
