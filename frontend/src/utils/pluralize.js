const pluralRules = new Intl.PluralRules('pl-PL');

export const PLACE_FORMS = { one: 'miejsce', few: 'miejsca', many: 'miejsc', other: 'miejsca' };
export const DAY_FORMS = { one: 'dzień', few: 'dni', many: 'dni', other: 'dnia' };

export const pluralize = (count, forms) =>
  `${count} ${forms[pluralRules.select(count)] ?? forms.many}`;