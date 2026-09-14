export default function handler(req, res) {
  const queryParams = new URLSearchParams(req.query).toString();
  const target = queryParams ? `/account?${queryParams}` : '/account';
  res.writeHead(302, { Location: target });
  res.end();
}
