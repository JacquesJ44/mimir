import { useState, useEffect } from "react";
import Select from "react-select";
import axios from "./AxiosInstance";
import useDebounce from "./useDebounce";

const SiteSelector = ({ label, value, setValue, setId }) => {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    const fetchSites = async () => {
      if (!debouncedInput.trim()) {
        setOptions([]);
        return;
      }
      try {
        const response = await axios.post(
          "/mimir/api/getsite",
          { site: debouncedInput },
          {
            headers: { "Content-Type": "application/json" },
            withCredentials: true,
          }
        );

        // Log full response for inspection
        // console.log(`${label} raw API response:`, response.data);

        setOptions(
          response.data.map((site) => ({
            label: site.site,
            value: site.id,
          }))
        );
      } catch (err) {
        console.error(`Failed to fetch ${label} options:`, err);
      }
    };
    fetchSites();
  }, [debouncedInput, label]);

  // Sync selectedOption with value
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }
    const found = options.find((opt) => opt.label === value);
    if (found) {
      setSelectedOption(found);
    } else {
      // fallback in case options don't include selected option
      setSelectedOption({ label: value, value: null });
    }
  }, [value, options]);

  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text">{label}</span>
      </label>
      <Select 
        inputValue={inputValue}
        onInputChange={(newInput) => {
          setInputValue(newInput);
        }}
        value={selectedOption}
        onChange={(selected) => {
          if (selected) {
            setValue(selected.label);
            setId(selected.value);
            setSelectedOption(selected);
            // console.log(`${label} selected:`, selected.label, selected.value);
          } else {
            setValue("");
            setId(null);
            setSelectedOption(null);
            // console.log(`${label} cleared`);
          }
        }}
        options={options}
        placeholder={`Type to search ${label}`}
        isClearable
        // onBlur={() => {
        //     if (!options.find(opt => opt.label === value)) {
        //         setValue('');
        //         setId(null);
        //         console.log(`${label} input cleared due to invalid selection`);
        //     }
        // }}
      />
    </div>
  );
};

export default SiteSelector;
