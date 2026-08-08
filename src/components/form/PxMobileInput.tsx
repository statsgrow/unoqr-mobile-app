
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Controller, type FieldPath, type FieldValues, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import { HelperText, Modal, Portal, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { phoneCountries } from "@/assets/data/countries";
import { colors } from "@/theme/themeSettings";

/* ------------------ TYPES ------------------ */

type PhoneCountry = (typeof phoneCountries)[number];

type PxMobileInputProps<TFieldValues extends FieldValues> = {
   name: FieldPath<TFieldValues>;
   RHF: UseFormReturn<TFieldValues>;
   label?: string;
   placeholder?: string;
   disabled?: boolean;
   rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
   defaultCountryCode?: string;
};

/* ------------------ HELPERS ------------------ */

const countriesByCodeLength = [...phoneCountries].sort((a, b) => b.code.length - a.code.length);

function sanitizeDigits(value: string) {
   return value.replace(/\D/g, "");
}

function findCountryFromFullNumber(digits: string) {
   return countriesByCodeLength.find((country) => digits.startsWith(country.code)) ?? null;
}

/* ------------------ BREAK ------------------ */

export function PxMobileInput<TFieldValues extends FieldValues>({
   name,
   RHF,
   label,
   placeholder,
   disabled = false,
   rules,
   defaultCountryCode = "91",
}: PxMobileInputProps<TFieldValues>) {
   const defaultCountry = phoneCountries.find((country) => country.code === defaultCountryCode) ?? phoneCountries[0];

   return (
      <Controller
         control={RHF.control}
         name={name}
         rules={rules}
         render={({ field, fieldState }) => (
            <>
               <MobileInputElement
                  field={field}
                  fieldState={fieldState}
                  label={label}
                  placeholder={placeholder}
                  disabled={disabled}
                  defaultCountry={defaultCountry}
               />

               {fieldState.error?.message ? (
                  <HelperText type="error" padding="none" style={styles.helperText}>
                     {fieldState.error.message}
                  </HelperText>
               ) : null}
            </>
         )}
      />
   );
}

export default PxMobileInput;

/* ------------------ BREAK ------------------ */

function MobileInputElement({ field, fieldState, label, placeholder, disabled, defaultCountry }: any) {
   const [focused, setFocused] = useState(false);
   const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(defaultCountry);
   const [localNumber, setLocalNumber] = useState("");

   // Determine if there's an error and if the input is active
   const hasError = Boolean(fieldState.error);
   const isActive = focused && !hasError;

   //
   useEffect(() => {
      const digits = sanitizeDigits(String(field.value ?? ""));
      if (!digits) {
         setLocalNumber("");
         return;
      }
      // Detect the country based on the full number
      const detectedCountry = findCountryFromFullNumber(digits);
      const activeCountry = detectedCountry ?? selectedCountry;

      //
      if (detectedCountry && detectedCountry.code !== selectedCountry.code) {
         setSelectedCountry(detectedCountry);
      }

      const numberWithoutCode = activeCountry && digits.startsWith(activeCountry.code)
         ? digits.slice(activeCountry.code.length)
         : digits;

      setLocalNumber(numberWithoutCode.slice(0, activeCountry.max));
   }, [field.value]);

   // Handle local number change
   function handleLocalNumberChange(inputValue: string) {
      const digits = sanitizeDigits(inputValue).slice(0, selectedCountry.max);
      setLocalNumber(digits);
      field.onChange(`${selectedCountry.code}${digits}`);
   };//method ends

   // Handle country selection
   function handleCountrySelect(country: PhoneCountry) {
      setSelectedCountry(country);

      const trimmedLocal = localNumber.slice(0, country.max);
      setLocalNumber(trimmedLocal);
      field.onChange(`${country.code}${trimmedLocal}`);
   };//method ends

   //Default Return
   return (
      <View style={{ gap: 4 }}>
         {label ? <Text style={styles.label}>{label}</Text> : null}

         <View
            style={[
               styles.inputShell,
               isActive && styles.inputShellActive,
               hasError && styles.inputShellError,
               disabled && styles.inputShellDisabled,
            ]}
         >
            <CountriesDialog
               selectedCountry={selectedCountry}
               onSelect={handleCountrySelect}
               disabled={disabled}
               isActive={isActive}
               hasError={hasError}
            />

            <View style={styles.inputPane}>
               <TextInput
                  dense
                  mode="flat"
                  value={localNumber}
                  onChangeText={handleLocalNumberChange}
                  onFocus={() => setFocused(true)}
                  onBlur={() => {
                     setFocused(false);
                     field.onBlur();
                  }}
                  placeholder={placeholder}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  disabled={disabled}
                  error={false}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  outlineColor="transparent"
                  activeOutlineColor="transparent"
               />
            </View>
         </View>
      </View>
   );
}

/* ------------------ BREAK ------------------ */

//type
type CountriesDialogProps = { selectedCountry: PhoneCountry; onSelect: (country: PhoneCountry) => void; disabled: boolean; isActive: boolean; hasError: boolean; };
//function
function CountriesDialog({ selectedCountry, onSelect, disabled, isActive, hasError }: CountriesDialogProps) {
   const [countryModalOpen, setCountryModalOpen] = useState(false);
   const [searchText, setSearchText] = useState("");

   //filtered countries based on search text
   const filteredCountries = useMemo(() => {
      const keyword = searchText.trim().toLowerCase();
      if (!keyword) {
         return phoneCountries;
      }

      return phoneCountries.filter((country) => (
         country.country.toLowerCase().includes(keyword)
         || country.code.includes(keyword)
         || country.shortCode.toLowerCase().includes(keyword)
      ));
   }, [searchText]);

   //Default Return
   return <>
      <Pressable
         disabled={disabled}
         onPress={() => setCountryModalOpen(true)}
         style={[
            styles.adornment,
            isActive && styles.adornmentActive,
            hasError && styles.adornmentError,
            disabled && styles.adornmentDisabled,
         ]}
      >
         <Text style={styles.emojiText}>{selectedCountry.emoji}</Text>
         <Text style={styles.prefixText}>+{selectedCountry.code}</Text>
         <MaterialCommunityIcons name="chevron-down" size={16} color={colors.grey[500]} />
      </Pressable>

      <Portal>
         <Modal visible={countryModalOpen} onDismiss={() => setCountryModalOpen(false)} contentContainerStyle={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Country Code</Text>

            <TextInput
               mode="outlined"
               value={searchText}
               onChangeText={setSearchText}
               placeholder="Search country or code"
               style={styles.searchInput}
               outlineStyle={styles.searchOutline}
               left={<TextInput.Icon icon="magnify" />}
            />

            <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent}>
               {filteredCountries.map((country) => {
                  const selected = country.code === selectedCountry.code;

                  return (
                     <Pressable
                        key={`${country.code}-${country.shortCode}`}
                        onPress={() => {
                           onSelect(country);
                           setCountryModalOpen(false);
                        }}
                        style={[styles.countryItem, selected && styles.countryItemSelected]}
                     >
                        <Text style={styles.countryText}>
                           {country.emoji} {country.country}
                        </Text>
                        <Text style={styles.countryCodeText}>+{country.code}</Text>
                     </Pressable>
                  );
               })}
            </ScrollView>
         </Modal>
      </Portal>
   </>;//return ends
};//func ends

/* ------------------ BREAK ------------------ */

const styles = StyleSheet.create({
   inputShell: {
      flexDirection: "row",
      alignItems: "stretch",
      borderWidth: 1.5,
      borderColor: colors.border.main,
      borderRadius: 12,
      backgroundColor: colors.white,
      overflow: "hidden",
   },
   inputShellError: {
      borderColor: colors.danger.main,
   },
   inputShellActive: {
      borderColor: colors.primary,
   },
   inputShellDisabled: {
      opacity: 0.7,
   },
   adornment: {
      minWidth: 80,
      paddingHorizontal: 10,
      gap: 4,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      backgroundColor: colors.grey[50],
      borderRightWidth: 1,
      borderRightColor: colors.border.main,
      borderTopLeftRadius: 12,
      borderBottomLeftRadius: 12,
   },
   adornmentError: {
      borderRightColor: colors.danger.main,
   },
   adornmentActive: {
      borderRightColor: colors.primary,
   },
   adornmentDisabled: {
      backgroundColor: colors.grey[100],
   },
   emojiText: {
      fontSize: 16,
      lineHeight: 18,
   },
   prefixText: {
      color: colors.grey[500],
      lineHeight: 16,
      fontSize: 13,
      fontWeight: "600",
   },
   inputPane: {
      flex: 1,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      overflow: "hidden",
   },
   input: {
      backgroundColor: colors.white,
      minHeight: 48,
      paddingHorizontal: 0,
   },
   inputContent: {
      paddingLeft: 12,
   },
   label: {
      color: colors.grey[500],
      marginLeft: 4,
      lineHeight: 16,
      fontSize: 13,
      fontWeight: "600",
   },
   helperText: {
      marginTop: 0,
      lineHeight: 12,
      marginLeft: 4,
      paddingBottom: 3,
   },
   modalContainer: {
      marginHorizontal: 20,
      backgroundColor: colors.white,
      borderRadius: 16,
      padding: 16,
      maxHeight: "75%",
   },
   modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.black,
      marginBottom: 12,
   },
   searchInput: {
      backgroundColor: colors.white,
   },
   searchOutline: {
      borderRadius: 10,
      borderColor: colors.border.main,
   },
   countryList: {
      marginTop: 12,
   },
   countryListContent: {
      gap: 6,
   },
   countryItem: {
      borderWidth: 1,
      borderColor: colors.border.main,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.white,
   },
   countryItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.grey[50],
   },
   countryText: {
      color: colors.black,
      fontSize: 14,
      flex: 1,
      marginRight: 8,
   },
   countryCodeText: {
      color: colors.grey[500],
      fontSize: 13,
      fontWeight: "700",
   },
});



