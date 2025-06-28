export default function formatFileUploadName(name) {
  return `${Date.now()}-${name}`;
}
