import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../config';
import { SearchableSelect } from './SearchableSelect';

interface AddressFormFieldsProps {
  token: string | null;
  provinceCode: string;
  provinceName?: string;
  wardCode: string;
  addressLine1: string;
  onChange: (updates: {
    province: string;
    provinceCode: string;
    ward: string;
    wardCode: string;
    addressLine1: string;
  }) => void;
  required?: boolean;
}

export const AddressFormFields: React.FC<AddressFormFieldsProps> = ({
  token,
  provinceCode,
  provinceName,
  wardCode,
  addressLine1,
  onChange,
  required = true,
}) => {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [wards, setWards] = useState<any[]>([]);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  // Fetch all provinces
  useEffect(() => {
    if (token) {
      const fetchProvinces = async () => {
        setLoadingProvinces(true);
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setProvinces(data.data || []);
          }
        } catch (err) {
          console.error('Error fetching provinces:', err);
        } finally {
          setLoadingProvinces(false);
        }
      };
      fetchProvinces();
    }
  }, [token]);

  // Resolve provinceCode from provinceName if provinceCode is empty but provinceName exists
  useEffect(() => {
    if (!provinceCode && provinceName && provinces.length > 0) {
      const matched = provinces.find(
        (p) =>
          p.fullName?.toLowerCase() === provinceName.toLowerCase() ||
          p.name?.toLowerCase() === provinceName.toLowerCase()
      );
      if (matched) {
        onChange({
          province: matched.fullName || matched.name,
          provinceCode: matched.code,
          ward: '', // keep empty as it will be updated by wardCode or wardChange
          wardCode: wardCode,
          addressLine1,
        });
      }
    }
  }, [provinceCode, provinceName, provinces, wardCode, addressLine1, onChange]);

  // Fetch wards when province code changes
  useEffect(() => {
    if (provinceCode && token) {
      const fetchWards = async () => {
        setLoadingWards(true);
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces/${provinceCode}/wards`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setWards(data.data || []);
          }
        } catch (err) {
          console.error('Error fetching wards:', err);
        } finally {
          setLoadingWards(false);
        }
      };
      fetchWards();
    } else {
      setWards([]);
    }
  }, [provinceCode, token]);

  const handleProvinceChange = (code: string) => {
    const matched = provinces.find((p) => p.code === code);
    onChange({
      province: matched ? matched.fullName : '',
      provinceCode: code,
      ward: '',
      wardCode: '',
      addressLine1,
    });
  };

  const handleWardChange = (code: string) => {
    const matched = wards.find((w) => w.code === code);
    onChange({
      province: provinces.find((p) => p.code === provinceCode)?.fullName || '',
      provinceCode,
      ward: matched ? matched.fullName || matched.name : '',
      wardCode: code,
      addressLine1,
    });
  };

  const handleAddressLine1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentProvince = provinces.find((p) => p.code === provinceCode)?.fullName || '';
    const currentWard = wards.find((w) => w.code === wardCode);
    const wardName = currentWard ? currentWard.fullName || currentWard.name : '';
    onChange({
      province: currentProvince,
      provinceCode,
      ward: wardName,
      wardCode,
      addressLine1: e.target.value,
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tỉnh / TP</label>
          <SearchableSelect
            options={provinces.map((p) => ({ value: p.code, label: p.fullName || p.name }))}
            value={provinceCode}
            onChange={handleProvinceChange}
            placeholder="-- Chọn Tỉnh/TP --"
            loading={loadingProvinces}
            required={required}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Phường / Xã</label>
          <SearchableSelect
            options={wards.map((w) => ({ value: w.code, label: w.fullName || w.name }))}
            value={wardCode}
            onChange={handleWardChange}
            placeholder="-- Chọn Phường/Xã --"
            disabled={!provinceCode}
            loading={loadingWards}
            required={required}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Địa chỉ chi tiết (Số nhà, đường)</label>
        <input
          type="text"
          required={required}
          placeholder="Ví dụ: 123 Nguyễn Trãi"
          value={addressLine1}
          onChange={handleAddressLine1Change}
          className="w-full px-3 py-2 border border-[#e2e8f0] rounded outline-none focus:border-[#bc0100]"
        />
      </div>
    </>
  );
};
