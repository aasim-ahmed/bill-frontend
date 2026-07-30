export const getItemKey = (item) => (
  item.isManual ? item.manualId : item.barcode
);
