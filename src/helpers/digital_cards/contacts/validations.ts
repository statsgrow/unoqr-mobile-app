import * as yup from "yup";

/* ------------------ BREAK ------------------ */

// Requires contact identity fields while allowing an empty mobile number.
export const digitalCardContactSchema = yup.object({
  first_name: yup.string().trim().required("Enter your first name.").max(100),
  last_name: yup.string().trim().required("Enter your last name.").max(100),
  email: yup.string().trim().required("Enter your email.").email("Enter a valid email.").max(254),
  mobile: yup.string().trim().defined().matches(/^[1-9]\d{0,2}-\d{6,15}$/, { excludeEmptyString: true, message: "Enter a valid mobile number with country code." })
}).required();//export ends
