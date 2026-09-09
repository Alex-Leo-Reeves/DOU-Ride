import java.sql.Connection;
import java.sql.DriverManager;
public class TestJDBC {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
        java.util.Properties props = new java.util.Properties();
        props.setProperty("user", "postgres.uawbhgrxmvwrhncpophm");
        props.setProperty("password", "iammasteralexd1$");
        try {
            Connection conn = DriverManager.getConnection(url, props);
            System.out.println("Success!");
        } catch(Exception e) {
            e.printStackTrace();
        }
    }
}
