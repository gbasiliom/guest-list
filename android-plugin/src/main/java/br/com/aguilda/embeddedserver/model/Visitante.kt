package br.com.aguilda.embeddedserver.model

data class Visitante(
    val id: String,
    var nome: String,
    var igreja: String,
    var local: String,
    var cargo: String,
    val criadoEm: Long
)

sealed class ItemExibicao {
    data class Individual(val visitante: Visitante) : ItemExibicao()
    data class Caravana(
        val etiqueta: String,
        val representante: Visitante,
        val membros: List<Visitante>,
        val totalPessoas: Int
    ) : ItemExibicao()
}
