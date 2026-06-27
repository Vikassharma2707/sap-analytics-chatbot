'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function WebGuiLaunchInner() {
  const searchParams = useSearchParams();
  const tcode = searchParams.get('tcode') || '';

  useEffect(() => {
    const status = document.getElementById('status')!;
    try {
      const raw = localStorage.getItem('sap-settings');
      if (!raw) { status.textContent = 'No SAP settings found — configure in Settings first.'; return; }

      const { state } = JSON.parse(raw);
      const { host, port, client, username, password, protocol = 'http' } = state.system;

      const url = `${protocol}://${host}:${port}/sap/bc/gui/sap/its/webgui`;

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;

      const fields: Record<string, string> = {
        'sap-user':     username,
        'sap-password': password,
        'sap-client':   client,
        'sap-language': 'EN',
      };

      // If a TCode was supplied, pass it directly so SAP opens that transaction
      if (tcode) fields['~transaction'] = tcode;

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type  = 'hidden';
        input.name  = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      status.textContent = tcode ? `Launching transaction ${tcode}…` : 'Submitting credentials…';
      form.submit();
    } catch {
      status.textContent = 'Failed to read SAP settings.';
    }
  }, [tcode]);

  return (
    <div style={{
      minHeight: '100vh', background: '#071224',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>🖥️</div>
      <p style={{ color: '#4a9eff', fontSize: 18, fontWeight: 600, margin: 0 }}>
        {tcode ? `Opening ${tcode} in SAP WebGUI…` : 'Opening SAP WebGUI…'}
      </p>
      <p id="status" style={{ color: '#7a9cc4', fontSize: 13, margin: 0 }}>Submitting credentials…</p>
    </div>
  );
}

export default function WebGuiLaunch() {
  return (
    <Suspense>
      <WebGuiLaunchInner />
    </Suspense>
  );
}
