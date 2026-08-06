import React, { useState, useEffect } from 'react';
import { CONFIG } from '../../config';
import { SearchableSelect } from './SearchableSelect';

interface AddressFormFieldsProps {
  token: string | null;
  provinceCode: string;
  provinceName?: string;
  wardCode: string;
  wardName?: string;
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
  disabled?: boolean;
  hasErrorProvince?: boolean;
  hasErrorWard?: boolean;
  hasErrorAddressLine1?: boolean;
}

export const AddressFormFields: React.FC<AddressFormFieldsProps> = ({
  token,
  provinceCode,
  provinceName,
  wardCode,
  wardName,
  addressLine1,
  onChange,
  required = true,
  disabled = false,
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
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);

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
          p.name?.toLowerCase() === provinceName.toLowerCase() ||
          provinceName.toLowerCase().includes(p.name?.toLowerCase()) ||
          provinceName.toLowerCase().includes(p.fullName?.toLowerCase())
      );
      if (matched) {
        onChange({
          province: matched.fullName || matched.name,
          provinceCode: matched.code,
          ward: wardName || '',
          wardCode: wardCode,
          addressLine1,
        });
      }
    }
  }, [provinceCode, provinceName, provinces, wardCode, wardName, addressLine1, onChange]);

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

  // Resolve wardCode from wardName if wardCode is not matched in wards list
  useEffect(() => {
    if (provinceCode && wards.length > 0) {
      const currentWardMatched = wards.find((w) => w.code === wardCode);
      if (!currentWardMatched && wardName) {
        const matchedW = wards.find(
          (w) =>
            w.fullName?.toLowerCase() === wardName.toLowerCase() ||
            w.name?.toLowerCase() === wardName.toLowerCase() ||
            wardName.toLowerCase().includes(w.name?.toLowerCase()) ||
            wardName.toLowerCase().includes(w.fullName?.toLowerCase())
        );
        if (matchedW) {
          const currentProvince = provinces.find((p) => p.code === provinceCode)?.fullName || provinceName || '';
          onChange({
            province: currentProvince,
            provinceCode,
            ward: matchedW.fullName || matchedW.name,
            wardCode: matchedW.code,
            addressLine1,
          });
        }
      }
    }
  }, [provinceCode, wards, wardCode, wardName, provinces, provinceName, addressLine1, onChange]);

  // Address suggestions autocomplete query with 400ms debounce
  useEffect(() => {
    if (!isUserTyping || !addressLine1 || addressLine1.length < 2 || !token) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const currentProvince = provinces.find((p) => p.code === provinceCode)?.fullName || '';
        const currentWard = wards.find((w) => w.code === wardCode);
        const wardNameStr = currentWard ? currentWard.fullName || currentWard.name : wardName || '';

        // Contextualize search with selected location if available
        const locationContext = [wardNameStr, currentProvince].filter(Boolean).join(', ');
        const queryInput = locationContext
          ? `${addressLine1}, ${locationContext}`
          : addressLine1;

        const res = await fetch(`${CONFIG.API_BASE_URL}/locations/autocomplete?input=${encodeURIComponent(queryInput)}`, {
          headers: { Authorization: `Bearer ${token}` },
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
    }, 400);

    return () => clearTimeout(timer);
  }, [addressLine1, provinceCode, wardCode, wardName, token, isUserTyping]);

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
    setIsUserTyping(true);
    const currentProvince = provinces.find((p) => p.code === provinceCode)?.fullName || '';
    const currentWard = wards.find((w) => w.code === wardCode);
    const wardNameStr = currentWard ? currentWard.fullName || currentWard.name : wardName || '';
    onChange({
      province: currentProvince,
      provinceCode,
      ward: wardNameStr,
      wardCode,
      addressLine1: e.target.value,
    });
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    setIsUserTyping(false);
    setShowSuggestions(false);

    // Extract ONLY the street/house main text, ignoring province/ward in the string
    let streetAddress = suggestion.structured_formatting?.main_text || suggestion.description;
    if (!suggestion.structured_formatting?.main_text && suggestion.description?.includes(',')) {
      streetAddress = suggestion.description.split(',')[0].trim();
    }

    const currentProvince = provinces.find((p) => p.code === provinceCode)?.fullName || '';
    const currentWard = wards.find((w) => w.code === wardCode);
    const wardName = currentWard ? currentWard.fullName || currentWard.name : '';

    let lat: number | undefined;
    let lng: number | undefined;

    if (token && suggestion.place_id) {
      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/locations/place-detail?placeId=${suggestion.place_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const detail = data.data;
          lat = detail.geometry?.location?.lat;
          lng = detail.geometry?.location?.lng;
        }
      } catch (err) {
        console.error('Error fetching place detail:', err);
      }
    }

    // Keep user's selected provinceCode and wardCode untouched!
    onChange({
      province: currentProvince,
      provinceCode,
      ward: wardName,
      wardCode,
      addressLine1: streetAddress,
      latitude: lat,
      longitude: lng,
    });
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
            disabled={disabled}
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
            disabled={disabled || !provinceCode}
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
          disabled={disabled}
          placeholder="Ví dụ: 123 Nguyễn Trãi"
          value={addressLine1}
          onChange={handleAddressLine1Change}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => { if (!disabled && suggestions.length > 0) setShowSuggestions(true); }}
          className={`w-full px-3 py-2 border rounded outline-none transition-colors ${disabled ? 'bg-slate-100/80 cursor-not-allowed text-slate-700 font-medium' : hasErrorAddressLine1 ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500' : 'border-[#e2e8f0] focus:border-[#bc0100]'}`}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e2e8f0] rounded shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(s)}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-[10px] text-gray-700 leading-snug flex flex-col gap-0.5"
              >
                <span className="font-bold text-[#161D25]">
                  {s.structured_formatting?.main_text || s.description.split(',')[0]}
                </span>
                <span className="text-[9px] text-gray-400">
                  {s.structured_formatting?.secondary_text || s.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
