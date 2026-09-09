import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
fun main() {
    val config = HikariConfig().apply {
        jdbcUrl = "jdbc:postgresql://postgres.uawbhgrxmvwrhncpophm:iammasteralexd1$@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
    }
    val ds = HikariDataSource(config)
    println(ds.connection.isValid(2))
}
