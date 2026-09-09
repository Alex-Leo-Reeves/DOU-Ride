import java.net.URI;
public class TestURI {
    public static void main(String[] args) throws Exception {
        URI uri = new URI("postgresql://postgres.uawbhgrxmvwrhncpophm:iammasteralexd1$@aws-0-eu-west-1.pooler.supabase.com:6543/postgres");
        System.out.println("User Info: " + uri.getUserInfo());
        System.out.println("Host: " + uri.getHost());
    }
}
