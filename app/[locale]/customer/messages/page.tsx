import MerchantMessagesClient from "../../merchant/messages/MerchantMessagesClient";

export const metadata = {
  title: "Messages | Shop Ship LTD",
  description: "View your conversations with merchants.",
};

export default function CustomerMessagesPage() {
  return (
    <MerchantMessagesClient
      cacheKey="customer_chats"
      realtimeChannelName="customer_messages"
    />
  );
}
