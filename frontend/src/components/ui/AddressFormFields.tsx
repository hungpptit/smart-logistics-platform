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
    latitude?: number;
    longitude?: number;
  }) => void;
  required?: boolean;
  hasErrorProvince?: boolean;
  hasErrorWard?: boolean;
  hasErrorAddressLine1?: boolean;
}

export const AddressFormFields: React.FC<AddressFormFieldsProps> = ({
  token,
  provinceCode,
  provinceName,
  wardCode,
  addressLine1,
  onChange,
  required = true,
  hasErrorProvince,
  hasErrorWard,
  hasErrorAddressLine1,
}) => {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [wards, setWards] = useState<any[]>([]);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  // Address Suggestions states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

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

  // Address suggestions autocomplete query with 500ms debounce
  useEffect(() => {
    if (!addressLine1 || addressLine1.length < 3 || !token) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/locations/autocomplete?input=${encodeURIComponent(addressLine1)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSuggestions(data.data || []);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('Error fetching address suggestions:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [addressLine1, token]);

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

  const handleSelectSuggestion = async (suggestion: any) => {
    setShowSuggestions(false);
    if (!token) return;

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/locations/place-detail?placeId=${suggestion.place_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const detail = data.data;
        const lat = detail.geometry?.location?.lat;
        const lng = detail.geometry?.location?.lng;
        const formattedAddress = detail.formatted_address || suggestion.description;

        let matchedProvinceCode = provinceCode;
        let matchedProvinceName = provinces.find(p => p.code === provinceCode)?.fullName || '';
        let matchedWardCode = wardCode;
        let matchedWardName = wards.find(w => w.code === wardCode)?.fullName || '';

        if (detail.compound) {
          const comp = detail.compound;
          if (comp.province) {
            const matchedP = provinces.find(
              p => p.fullName?.toLowerCase().includes(comp.province.toLowerCase()) || 
                   comp.province.toLowerCase().includes(p.fullName?.toLowerCase())
            );
            if (matchedP) {
              matchedProvinceCode = matchedP.code;
              matchedProvinceName = matchedP.fullName || matchedP.name;
            }
          }

          if (matchedProvinceCode && comp.commune) {
            try {
              const wardsRes = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces/${matchedProvinceCode}/wards`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const wardsData = await wardsRes.json();
              if (wardsRes.ok && wardsData.success) {
                const matchedW = (wardsData.data || []).find(
                  (w: any) => w.fullName?.toLowerCase().includes(comp.commune.toLowerCase()) ||
                              comp.commune.toLowerCase().includes(w.fullName?.toLowerCase())
                );
                if (matchedW) {
                  matchedWardCode = matchedW.code;
                  matchedWardName = matchedW.fullName || matchedW.name;
                }
              }
            } catch (err) {
              console.error('Error matching ward:', err);
            }
          }
        }

        onChange({
          province: matchedProvinceName,
          provinceCode: matchedProvinceCode,
          ward: matchedWardName,
          wardCode: matchedWardCode,
          addressLine1: formattedAddress,
          latitude: lat,
          longitude: lng
        });
      }
    } catch (err) {
      console.error('Error fetching place detail:', err);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex flex-col gap-1 rounded-md transition-all ${hasErrorProvince ? 'ring-2 ring-red-500 rounded p-0.5 bg-red-50/40' : ''}`}>
          <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Tỉnh / TP {hasErrorProvince && <span className="text-red-500">*</span>}</label>
          <SearchableSelect
            options={provinces.map((p) => ({ value: p.code, label: p.fullName || p.name }))}
            value={provinceCode}
            onChange={handleProvinceChange}
            placeholder="-- Chọn Tỉnh/TP --"
            loading={loadingProvinces}
            required={required}
          />
        </div>
        <div className={`flex flex-col gap-1 rounded-md transition-all ${hasErrorWard ? 'ring-2 ring-red-500 rounded p-0.5 bg-red-50/40' : ''}`}>
          <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">Phường / Xã {hasErrorWard && <span className="text-red-500">*</span>}</label>
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
      <div className="flex flex-col gap-1 relative">
        <label className="font-bold text-gray-500 uppercase text-[9px] tracking-wider">
          Địa chỉ chi tiết (Số nhà, đường) {loadingSuggestions && <span className="text-[8px] text-gray-400 normal-case">(Đang tìm...)</span>} {hasErrorAddressLine1 && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          required={required}
          placeholder="Ví dụ: 123 Nguyễn Trãi"
          value={addressLine1}
          onChange={handleAddressLine1Change}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          className={`w-full px-3 py-2 border rounded outline-none transition-colors ${hasErrorAddressLine1 ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500' : 'border-[#e2e8f0] focus:border-[#bc0100]'}`}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(s)}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-[10px] text-gray-700 leading-snug"
              >
                {s.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
