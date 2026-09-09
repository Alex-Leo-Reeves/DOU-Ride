import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;

public class TestJDBC {
    public static void main(String[] args) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:6543/postgres?user=postgres.uawbhgrxmvwrhncpophm&password=iammasteralexd1$&sslmode=require");
        config.setDriverClassName("org.postgresql.Driver");
        
        System.out.println("Connecting...");
        try (HikariDataSource ds = new HikariDataSource(config)) {
            try (Connection conn = ds.getConnection()) {
                System.out.println("Connected: " + (conn != null));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
