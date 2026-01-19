// Edge function to serve assetlinks.json for Android App Links
export default async (request, context) => {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.baatcheet.app",
        sha256_cert_fingerprints: [
          "69:BB:5D:38:A6:D4:FA:B6:83:26:34:DD:7D:E6:3B:F8:58:C1:55:98:6F:F2:6D:35:AB:71:40:0D:D6:A7:04:F7"
        ]
      }
    }
  ];

  return new Response(JSON.stringify(assetlinks, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    }
  });
};

export const config = {
  path: "/.well-known/assetlinks.json"
};
