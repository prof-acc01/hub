# HUB

Este repositório atua como ponto central de integração entre o repositório do professor e o repositório do aluno.  
Ele só funciona em conjunto com esses dois repositórios, que podem ser encontrados nos seguintes links:  
- [Repositório do Professor](https://github.com/leol0ps/Repo-modelo-professor)  
- [Repositório do Aluno](https://github.com/leol0ps/Repo-modelo-aluno)  

Configurações para  utilizar:  
 - crie uma cópia deste repositório (use this template).
 - Crie um [PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)   
 - Crie um [secret](https://docs.github.com/pt/actions/security-guides/using-secrets-in-github-actions) neste repositório utilizando o PAT, o nome padrão do secret utilizado nas actions é token
 - Modifique o workflow nvm.yml colocando suas credenciais (utilizando o secret criado) e modifique o repo de soluções para o seu, abaixo segue detalhadamente as mudanças necessárias no arquivo nvm.yml:

   - linha 19: mudar secrets.token para secrets.NOME_DO_SEU_TOKEN
   - linha 30: mude 'leol0ps/backup-tcc' para seu repositório de soluções exemplo 'conta-professor/repositorio-professor'
   - linha 31: mudar secrets.BASE_REPO para secrets.NOME_DO_SEU_TOKEN
   - linha 137: inserir seu usuario (usuario dono do repositório hub)
   - linha 138: inserir seu email 
   - linha 139: mudar secrets.token para secrets.NOME_DO_SEU_TOKEN
- Envie aos alunos o convite de colaborador

Obs: Por contas dos workflows a sua conta dona deste repositório receberá várias notificações, é aconselhável utilizar uma conta secundária e desligar as notificações.
