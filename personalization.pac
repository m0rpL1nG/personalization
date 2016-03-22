function FindProxyForURL(url, host) {
//	if (shExpMatch(host, "*.expedia.com")) {
  if (shExpMatch(url, "http://www.expedia.com/vspersonal*")) {
    return "PROXY 52.7.16.1:8080";
  }
//  if (shExpMatch(url, "https://www.expedia.com/vspersonal*")) {
//    return "PROXY 52.7.16.1:8080";
//  }
  return "DIRECT";
}