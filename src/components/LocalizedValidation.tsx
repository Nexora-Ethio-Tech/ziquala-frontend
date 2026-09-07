import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { uiText } from '../localization';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isField = (target: EventTarget | null): target is Field => target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

/** Browser-native validation otherwise uses the browser's language, not the site's language. */
export function LocalizedValidation() {
  const { i18n } = useTranslation();
  const owned = useRef(new Set<Field>());
  useEffect(() => {
    const localize = (field: Field) => {
      if (field.validity.customError && !owned.current.has(field)) return;
      field.setCustomValidity('');
      const validity = field.validity;
      let message = '';
      if (validity.valueMissing) message = uiText('Please complete this field.');
      else if (validity.typeMismatch) message = uiText(field instanceof HTMLInputElement && field.type === 'email' ? 'Please enter a valid email address.' : 'Please enter a valid web address.');
      else if (validity.badInput) message = uiText('Please enter a valid number.');
      else if (validity.tooShort && 'minLength' in field) message = uiText('Please enter at least {{value0}} characters.', { value0: field.minLength });
      else if (validity.tooLong && 'maxLength' in field) message = uiText('Please enter no more than {{value0}} characters.', { value0: field.maxLength });
      else if (validity.rangeUnderflow && field instanceof HTMLInputElement) message = uiText('Please enter a value of at least {{value0}}.', { value0: field.min });
      else if (validity.rangeOverflow && field instanceof HTMLInputElement) message = uiText('Please enter a value no greater than {{value0}}.', { value0: field.max });
      else if (!validity.valid) message = uiText('Please enter a valid value for this field.');
      field.setCustomValidity(message);
      if (message) owned.current.add(field);
      else owned.current.delete(field);
    };
    const onInvalid = (event: Event) => { if (isField(event.target)) localize(event.target); };
    const onInput = (event: Event) => {
      if (isField(event.target) && owned.current.delete(event.target)) event.target.setCustomValidity('');
    };
    for (const field of owned.current) {
      if (field.isConnected) localize(field);
      else owned.current.delete(field);
    }
    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
    };
  }, [i18n.language]);
  return null;
}
