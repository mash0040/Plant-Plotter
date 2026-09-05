const VALID_SOIL_TYPES = ['Loamy', 'Clay', 'Sandy', 'Silt', 'Peat', 'Chalk'];
const VALID_STATUSES = ['Planning', 'Active', 'Dormant'];

const isInvalidPlaceholder = (value) => {
  return value === '[object Object]' || value === 'undefined' || value === 'null';
};

const validateStringField = (value, {
  field,
  required = false,
  maxLength,
  defaultValue = undefined
}) => {
  if (value === null || value === undefined) {
    if (required) {
      return { error: `${field} is required` };
    }
    return { value: defaultValue };
  }

  if (typeof value !== 'string') {
    return { error: `${field} must be text` };
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    return { error: `${field} is required` };
  }

  if (trimmed && isInvalidPlaceholder(trimmed)) {
    return { error: `${field} is invalid` };
  }

  if (!trimmed && defaultValue !== undefined) {
    return { value: defaultValue };
  }

  if (trimmed.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }

  return { value: trimmed };
};

const validateIntegerDimension = (value, field) => {
  if (value === null || value === undefined) {
    return { error: `${field} is required` };
  }

  if (typeof value === 'string' && !value.trim()) {
    return { error: `${field} is required` };
  }

  if (typeof value === 'boolean' || typeof value === 'object') {
    return { error: `${field} must be a valid number` };
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return { error: `${field} must be a valid number` };
  }

  if (!Number.isInteger(numberValue)) {
    return { error: `${field} must be a whole number` };
  }

  if (numberValue < 1 || numberValue > 100) {
    return { error: `${field} must be between 1 and 100` };
  }

  return { value: numberValue };
};

const validateEnumField = (value, {
  field,
  allowedValues,
  defaultValue
}) => {
  if (value === null || value === undefined || value === '') {
    return { value: defaultValue };
  }

  if (typeof value !== 'string') {
    return { error: `${field} must be text` };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { value: defaultValue };
  }

  if (!allowedValues.includes(trimmed)) {
    return { error: `${field} must be one of: ${allowedValues.join(', ')}` };
  }

  return { value: trimmed };
};

const validateGardenPayload = (rawData = {}) => {
  const errors = {};

  const name = validateStringField(rawData.name, {
    field: 'Garden name',
    required: true,
    maxLength: 50
  });
  if (name.error) errors.name = name.error;

  const description = validateStringField(rawData.description, {
    field: 'Description',
    required: false,
    maxLength: 1000,
    defaultValue: ''
  });
  if (description.error) errors.description = description.error;

  const width = validateIntegerDimension(rawData.width, 'Width');
  if (width.error) errors.width = width.error;

  const height = validateIntegerDimension(rawData.height, 'Height');
  if (height.error) errors.height = height.error;

  const location = validateStringField(rawData.location, {
    field: 'Location',
    required: false,
    maxLength: 100,
    defaultValue: null
  });
  if (location.error) errors.location = location.error;

  const soilType = validateEnumField(rawData.soil_type, {
    field: 'Soil type',
    allowedValues: VALID_SOIL_TYPES,
    defaultValue: 'Loamy'
  });
  if (soilType.error) errors.soil_type = soilType.error;

  const status = validateEnumField(rawData.status, {
    field: 'Status',
    allowedValues: VALID_STATUSES,
    defaultValue: 'Active'
  });
  if (status.error) errors.status = status.error;

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      name: name.value,
      description: description.value,
      width: width.value,
      height: height.value,
      soil_type: soilType.value,
      location: location.value,
      status: status.value
    }
  };
};

module.exports = {
  VALID_SOIL_TYPES,
  VALID_STATUSES,
  validateGardenPayload
};
