import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function Vendors() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    api
      .get('/vendors')
      .then((res) => setVendors(res?.data?.data || res?.data || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Vendors</h2>
      <div style={{ color: '#64748b' }}>Placeholder. Vendors: {Array.isArray(vendors) ? vendors.length : 0}</div>
    </div>
  );
}

