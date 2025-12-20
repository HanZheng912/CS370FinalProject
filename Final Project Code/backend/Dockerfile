
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

Copy only what Maven needs
COPY pom.xml .
COPY src ./src

RUN mvn -q clean package -DskipTests


FROM tomcat:9.0-jdk17-temurin

RUN rm -rf /usr/local/tomcat/webapps/*

Copy WAR built in stage 1 to ROOT.war so it runs at "/"
COPY --from=build /app/target/*.war /usr/local/tomcat/webapps/ROOT.war

CMD ["sh", "-c", "sed -i 's/port="8080"/port="'"$PORT"'"/g' /usr/local/tomcat/conf/server.xml && catalina.sh run"]